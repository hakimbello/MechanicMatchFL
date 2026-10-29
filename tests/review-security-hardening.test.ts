import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { deliverReviewVerification } from "../src/reviews/reviewDelivery.ts";
import {
  InMemoryReviewPersistence,
  ReviewPersistenceError,
  type CreateReviewRecordInput
} from "../src/reviews/reviewPersistence.ts";
import {
  getReviewRateLimitIdentity,
  SHARED_REVIEW_RATE_LIMIT_IDENTITY
} from "../src/reviews/reviewRequestIdentity.ts";

const providerId = "00000000-0000-0000-0000-000000000111";

function pendingInput(index = 0, overrides: Partial<CreateReviewRecordInput> = {}): CreateReviewRecordInput {
  return {
    providerId,
    rating: 3,
    reviewText: "A sufficiently detailed customer review for security testing.",
    reviewerEmail: `reviewer-${index}@example.test`,
    emailHash: (index + 1).toString(16).padStart(64, "0"),
    ipHash: "a".repeat(64),
    tokenHash: (index + 20).toString(16).padStart(64, "0"),
    verificationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
}

test("Vercel review identity ignores spoofed ordinary forwarding headers", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "203.0.113.42",
    "x-forwarded-for": "198.51.100.99"
  });
  assert.equal(getReviewRateLimitIdentity(headers, { VERCEL: "1" }), "ip:203.0.113.42");
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-forwarded-for": "198.51.100.99" }), { VERCEL: "1" }),
    SHARED_REVIEW_RATE_LIMIT_IDENTITY
  );
});

test("missing, malformed, and non-Vercel headers use the conservative shared bucket", () => {
  assert.equal(getReviewRateLimitIdentity(new Headers(), { VERCEL: "1" }), SHARED_REVIEW_RATE_LIMIT_IDENTITY);
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-vercel-forwarded-for": "203.0.113.1, 198.51.100.1" }), { VERCEL: "1" }),
    SHARED_REVIEW_RATE_LIMIT_IDENTITY
  );
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-vercel-forwarded-for": "203.0.113.42" }), {}),
    SHARED_REVIEW_RATE_LIMIT_IDENTITY
  );
});

test("trusted Vercel identities accept IPv4 and normalized IPv6 only", () => {
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-vercel-forwarded-for": "192.0.2.8" }), { VERCEL: "1" }),
    "ip:192.0.2.8"
  );
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-vercel-forwarded-for": "2001:DB8::8" }), { VERCEL: "1" }),
    "ip:2001:db8::8"
  );
  assert.equal(
    getReviewRateLimitIdentity(new Headers({ "x-vercel-forwarded-for": "192.0.2.8:443" }), { VERCEL: "1" }),
    SHARED_REVIEW_RATE_LIMIT_IDENTITY
  );
});

test("concurrent submissions cannot race past the shared database limit", async () => {
  const persistence = new InMemoryReviewPersistence({ [providerId]: "Active Garage" });
  const outcomes = await Promise.all(
    Array.from({ length: 6 }, (_, index) => persistence.createPendingReview(pendingInput(index)))
  );
  assert.equal(outcomes.filter((result) => result.outcome === "created").length, 5);
  assert.equal(outcomes.filter((result) => result.outcome === "rate-limited").length, 1);
});

test("provider delivery failure cleans up and permits a retry", async () => {
  const persistence = new InMemoryReviewPersistence({ [providerId]: "Active Garage" });
  const input = pendingInput();
  const created = await persistence.createPendingReview(input);
  const delivered = await deliverReviewVerification(
    created.reviewId!,
    input.tokenHash,
    { recipient: input.reviewerEmail, providerName: "Active Garage", verificationUrl: "https://example.test/reviews/verify#token=test", idempotencyKey: "test-provider-failure" },
    { async sendVerificationEmail() { throw new Error("provider unavailable"); } },
    persistence
  );
  assert.equal(delivered, false);
  assert.equal((await persistence.createPendingReview(pendingInput(0, { tokenHash: "f".repeat(64) }))).outcome, "created");
});

test("accepted-but-unmarked delivery stays unsuccessful and cleanup failure remains retryable", async () => {
  class PartialFailurePersistence extends InMemoryReviewPersistence {
    private failMark = true;
    private failCleanup = true;

    override async markVerificationEmailSent(reviewId: string, tokenHash: string, deliveryId: string) {
      if (this.failMark) {
        this.failMark = false;
        throw new ReviewPersistenceError();
      }
      return super.markVerificationEmailSent(reviewId, tokenHash, deliveryId);
    }

    override async discardUndeliveredReview(reviewId: string, tokenHash: string) {
      if (this.failCleanup) {
        this.failCleanup = false;
        throw new ReviewPersistenceError();
      }
      return super.discardUndeliveredReview(reviewId, tokenHash);
    }
  }
  const persistence = new PartialFailurePersistence({ [providerId]: "Active Garage" });
  const input = pendingInput();
  const created = await persistence.createPendingReview(input);
  const delivered = await deliverReviewVerification(
    created.reviewId!,
    input.tokenHash,
    { recipient: input.reviewerEmail, providerName: "Active Garage", verificationUrl: "https://example.test/reviews/verify#token=test", idempotencyKey: "test-partial-failure" },
    { async sendVerificationEmail() { return { deliveryId: "accepted" }; } },
    persistence
  );
  assert.equal(delivered, false);

  const replacementToken = "e".repeat(64);
  const retry = await persistence.createPendingReview(pendingInput(0, { tokenHash: replacementToken }));
  assert.equal(retry.outcome, "created");
  assert.equal(await persistence.verifyReviewEmail(input.tokenHash), "invalid");
  assert.equal(await deliverReviewVerification(
    retry.reviewId!,
    replacementToken,
    { recipient: input.reviewerEmail, providerName: "Active Garage", verificationUrl: "https://example.test/reviews/verify#token=replacement", idempotencyKey: "test-retry" },
    { async sendVerificationEmail() { return { deliveryId: "accepted-retry" }; } },
    persistence
  ), true);
  assert.equal(await persistence.verifyReviewEmail(replacementToken), "verified");
});

test("expired sent verification state can be replaced without activating its old token", async () => {
  const persistence = new InMemoryReviewPersistence({ [providerId]: "Active Garage" });
  const expiredInput = pendingInput(0, { verificationExpiresAt: new Date(Date.now() - 1_000).toISOString() });
  const expired = await persistence.createPendingReview(expiredInput);
  await persistence.markVerificationEmailSent(expired.reviewId!, expiredInput.tokenHash, "accepted-expired");

  const replacementToken = "d".repeat(64);
  assert.equal((await persistence.createPendingReview(pendingInput(0, { tokenHash: replacementToken }))).outcome, "created");
  assert.equal(await persistence.verifyReviewEmail(expiredInput.tokenHash), "invalid");
});

test("an ambiguous mark response preserves the one active accepted link", async () => {
  class CommittedMarkPersistence extends InMemoryReviewPersistence {
    override async markVerificationEmailSent(reviewId: string, tokenHash: string, deliveryId: string) {
      await super.markVerificationEmailSent(reviewId, tokenHash, deliveryId);
      throw new ReviewPersistenceError();
    }
  }
  const persistence = new CommittedMarkPersistence({ [providerId]: "Active Garage" });
  const input = pendingInput();
  const created = await persistence.createPendingReview(input);
  assert.equal(await deliverReviewVerification(
    created.reviewId!,
    input.tokenHash,
    { recipient: input.reviewerEmail, providerName: "Active Garage", verificationUrl: "https://example.test/reviews/verify#token=active", idempotencyKey: "test-committed-mark" },
    { async sendVerificationEmail() { return { deliveryId: "accepted-active" }; } },
    persistence
  ), false);
  assert.equal((await persistence.createPendingReview(pendingInput(0, { tokenHash: "f".repeat(64) }))).outcome, "duplicate");
  assert.equal(await persistence.verifyReviewEmail(input.tokenHash), "verified");
});

test("all security-definer RPCs use an empty search path and service-role-only execution", () => {
  const migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const functions = [
    "submit_customer_review",
    "mark_customer_review_email_sent",
    "discard_undelivered_customer_review",
    "verify_customer_review_email",
    "moderate_customer_review"
  ];
  for (const functionName of functions) {
    const definition = migration.match(new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
    assert.match(definition, /security definer/i);
    assert.match(definition, /set search_path = ''/i);
    assert.match(migration, new RegExp(`revoke execute on function public\\.${functionName}[\\s\\S]*?from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*?to service_role`, "i"));
  }
});

test("moderation attribution is bound to auth.uid and cannot accept a forged admin ID", () => {
  const migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const persistence = readFileSync("src/reviews/supabaseReviewPersistence.ts", "utf8");
  assert.doesNotMatch(migration, /p_admin_id/i);
  assert.match(migration, /admin_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(migration, /authorization_hash = p_authorization_hash and expires_at > now\(\)/i);
  assert.match(migration, /delete from public\.customer_review_moderation_authorizations[\s\S]*authorization_hash = p_authorization_hash/i);
  assert.match(migration, /user_id = v_admin_id and disabled_at is null/i);
  assert.doesNotMatch(persistence, /p_admin_id/);
  assert.match(persistence, /authenticatedAdminClient[\s\S]*customer_review_moderation_authorizations/);
});

test("public views stay active-only and exclude all private review fields", () => {
  const migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const view = migration.match(/create or replace view public\.approved_public_reviews[\s\S]*?p\.status = 'active';/i)?.[0] ?? "";
  assert.match(view, /r\.status = 'approved'/i);
  assert.match(view, /p\.status = 'active'/i);
  assert.doesNotMatch(view, /reviewer_email|verification_token|delivery_id|request_ip|moderation_reason|moderated_by/i);
});

test("verification tokens stay out of request URLs, referrers, and server-rendered query parameters", () => {
  const service = readFileSync("src/reviews/reviewService.ts", "utf8");
  const page = readFileSync("app/reviews/verify/page.tsx", "utf8");
  const clientForm = readFileSync("app/reviews/verify/verification-token-form.tsx", "utf8");
  const analytics = readFileSync("app/site-analytics.tsx", "utf8");
  assert.match(service, /verificationUrl\.hash = `token=\$\{token\}`/);
  assert.doesNotMatch(service, /searchParams\.set\("token"/);
  assert.match(page, /referrer: "no-referrer"/);
  assert.doesNotMatch(page, /token\?: string/);
  assert.match(clientForm, /window\.location\.hash/);
  assert.match(clientForm, /window\.history\.replaceState/);
  assert.match(analytics, /pathname === "\/reviews\/verify"/);
  assert.match(analytics, /return null/);
});

test("rollback removes nonce state after its RPC and retains the review-data guard", () => {
  const rollback = readFileSync("supabase/rollbacks/202610290002_add_m12_verified_customer_reviews.down.sql", "utf8");
  assert.match(rollback, /Cannot roll back M12 while customer reviews exist/);
  assert.ok(rollback.indexOf("drop function if exists public.moderate_customer_review") < rollback.indexOf("drop table if exists public.customer_review_moderation_authorizations"));
  assert.ok(rollback.indexOf("customer_review_moderation_authorizations") < rollback.indexOf("drop table if exists public.customer_reviews"));
});

test("M12 foreign keys and RPCs preserve the established text provider ID type", () => {
  const providerMigration = readFileSync("supabase/migrations/202609160001_prepare_provider_persistence.sql", "utf8");
  const reviewMigration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const rollback = readFileSync("supabase/rollbacks/202610290002_add_m12_verified_customer_reviews.down.sql", "utf8");
  assert.match(providerMigration, /create table if not exists public\.provider_records \([\s\S]*?id text primary key/i);
  assert.match(reviewMigration, /provider_id text not null references public\.provider_records\(id\)/i);
  assert.match(reviewMigration, /public\.submit_customer_review\(\s*p_provider_id text/i);
  assert.match(rollback, /submit_customer_review\(text, smallint/i);
});
