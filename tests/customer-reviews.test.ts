import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { InMemoryReviewPersistence } from "../src/reviews/reviewPersistence.ts";
import type { CreateReviewRecordInput } from "../src/reviews/reviewPersistence.ts";
import type { ReviewSubmissionInput } from "../src/reviews/reviewTypes.ts";
import { validateReviewSubmission } from "../src/reviews/reviewValidation.ts";

const validInput: ReviewSubmissionInput = {
  providerId: "00000000-0000-0000-0000-000000000111",
  rating: 1,
  reviewText: "The repair took longer than expected, but the final work was explained clearly.",
  reviewerEmail: "customer@example.test",
  displayName: "A Customer",
  website: ""
};

function pendingInput(overrides: Partial<CreateReviewRecordInput> = {}): CreateReviewRecordInput {
  return {
    providerId: validInput.providerId,
    rating: validInput.rating,
    reviewText: validInput.reviewText,
    reviewerEmail: validInput.reviewerEmail,
    displayName: validInput.displayName,
    emailHash: "a".repeat(64),
    ipHash: "b".repeat(64),
    tokenHash: "c".repeat(64),
    verificationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
}

test("review validation accepts whole-number 1-5 ratings and genuine negative feedback", () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.deepEqual(validateReviewSubmission({ ...validInput, rating }), {});
  }
});

test("review validation rejects invalid ratings, missing text, and excessive text", () => {
  assert.ok(validateReviewSubmission({ ...validInput, rating: 0 }).rating);
  assert.ok(validateReviewSubmission({ ...validInput, rating: 6 }).rating);
  assert.ok(validateReviewSubmission({ ...validInput, rating: 2.5 }).rating);
  assert.ok(validateReviewSubmission({ ...validInput, reviewText: "too short" }).reviewText);
  assert.ok(validateReviewSubmission({ ...validInput, reviewText: "x".repeat(2001) }).reviewText);
});

test("review validation protects email, name, and honeypot boundaries", () => {
  assert.ok(validateReviewSubmission({ ...validInput, reviewerEmail: "invalid" }).reviewerEmail);
  assert.ok(validateReviewSubmission({ ...validInput, displayName: "x".repeat(81) }).displayName);
  assert.ok(validateReviewSubmission({ ...validInput, website: "https://bot.test" }).website);
  assert.deepEqual(validateReviewSubmission({ ...validInput, displayName: "" }), {});
});

test("only active providers accept reviews and duplicates are blocked", async () => {
  const inactive = new InMemoryReviewPersistence();
  assert.equal((await inactive.createPendingReview(pendingInput())).outcome, "inactive-provider");

  const persistence = new InMemoryReviewPersistence({ [validInput.providerId]: "Active Garage" });
  assert.equal((await persistence.createPendingReview(pendingInput())).outcome, "created");
  assert.equal((await persistence.createPendingReview(pendingInput({ tokenHash: "d".repeat(64) }))).outcome, "duplicate");
});

test("verification tokens expire and cannot be replayed", async () => {
  const persistence = new InMemoryReviewPersistence({ [validInput.providerId]: "Active Garage" });
  const expired = await persistence.createPendingReview(pendingInput({ verificationExpiresAt: new Date(Date.now() - 1_000).toISOString() }));
  assert.equal(expired.outcome, "created");
  await persistence.markVerificationEmailSent(expired.reviewId!, "c".repeat(64), "delivery-expired");
  assert.equal(await persistence.verifyReviewEmail("c".repeat(64)), "expired");

  const fresh = await persistence.createPendingReview(pendingInput({ reviewerEmail: "second@example.test", emailHash: "e".repeat(64), tokenHash: "f".repeat(64) }));
  await persistence.markVerificationEmailSent(fresh.reviewId!, "f".repeat(64), "delivery-fresh");
  assert.equal(await persistence.verifyReviewEmail("f".repeat(64)), "verified");
  assert.equal(await persistence.verifyReviewEmail("f".repeat(64)), "used");
});

test("durable rate limits apply per IP and email hash", async () => {
  const persistence = new InMemoryReviewPersistence({ [validInput.providerId]: "Active Garage" });
  for (let index = 0; index < 5; index += 1) {
    const result = await persistence.createPendingReview(pendingInput({
      reviewerEmail: `ip-${index}@example.test`, emailHash: index.toString(16).padStart(64, "0"), tokenHash: (index + 1).toString(16).padStart(64, "0")
    }));
    assert.equal(result.outcome, "created");
  }
  assert.equal((await persistence.createPendingReview(pendingInput({ reviewerEmail: "blocked@example.test", emailHash: "9".repeat(64), tokenHash: "8".repeat(64) }))).outcome, "rate-limited");
});

test("pending and rejected reviews remain private while approved negative reviews publish", async () => {
  const persistence = new InMemoryReviewPersistence({ [validInput.providerId]: "Active Garage" });
  const created = await persistence.createPendingReview(pendingInput());
  await persistence.markVerificationEmailSent(created.reviewId!, "c".repeat(64), "delivery");
  assert.deepEqual(await persistence.listPublicReviews(validInput.providerId), []);
  await persistence.verifyReviewEmail("c".repeat(64));
  await persistence.moderateReview({ reviewId: created.reviewId!, decision: "approved", reason: "Authentic experience and policy-compliant content." }, { userId: "admin" });

  const positive = await persistence.createPendingReview(pendingInput({
    rating: 5, reviewerEmail: "positive@example.test", emailHash: "d".repeat(64), ipHash: "e".repeat(64), tokenHash: "f".repeat(64)
  }));
  await persistence.markVerificationEmailSent(positive.reviewId!, "f".repeat(64), "delivery-positive");
  await persistence.verifyReviewEmail("f".repeat(64));
  await persistence.moderateReview({ reviewId: positive.reviewId!, decision: "approved", reason: "Specific experience and policy-compliant content." }, { userId: "admin" });

  const rejected = await persistence.createPendingReview(pendingInput({
    rating: 3, reviewerEmail: "rejected@example.test", emailHash: "1".repeat(64), ipHash: "2".repeat(64), tokenHash: "3".repeat(64)
  }));
  await persistence.markVerificationEmailSent(rejected.reviewId!, "3".repeat(64), "delivery-rejected");
  await persistence.verifyReviewEmail("3".repeat(64));
  await persistence.moderateReview({ reviewId: rejected.reviewId!, decision: "rejected", reason: "Contains personal information that cannot be published." }, { userId: "admin" });

  const publicReviews = await persistence.listPublicReviews(validInput.providerId);
  assert.deepEqual(publicReviews.map((review) => review.rating), [1, 5]);
  assert.equal(publicReviews[0].reviewerName, "A Customer");
  assert.equal("reviewerEmail" in publicReviews[0], false);
  assert.equal(publicReviews.some((review) => review.id === rejected.reviewId), false);
  assert.deepEqual(await persistence.getPublicReviewAggregate(validInput.providerId), { providerId: validInput.providerId, reviewCount: 2, averageRating: 3 });
});

test("blank display names publish as Anonymous", async () => {
  const persistence = new InMemoryReviewPersistence({ [validInput.providerId]: "Active Garage" });
  const created = await persistence.createPendingReview(pendingInput({ displayName: undefined }));
  await persistence.markVerificationEmailSent(created.reviewId!, "c".repeat(64), "delivery");
  await persistence.verifyReviewEmail("c".repeat(64));
  await persistence.moderateReview({ reviewId: created.reviewId!, decision: "approved", reason: "Content meets the published review policy." }, { userId: "admin" });
  assert.equal((await persistence.listPublicReviews(validInput.providerId))[0].reviewerName, "Anonymous");
});

test("M12 migration keeps review identity private and public data approved-only", () => {
  const migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const publicView = migration.match(/create or replace view public\.approved_public_reviews[\s\S]*?from public\.customer_reviews r[\s\S]*?p\.status = 'active';/i)?.[0] ?? "";
  assert.match(migration, /alter table public\.customer_reviews enable row level security/);
  assert.match(migration, /revoke all on table public\.customer_reviews from anon, authenticated/);
  assert.match(migration, /grant select on table public\.approved_public_reviews to anon, authenticated/);
  assert.match(publicView, /r\.status = 'approved'/);
  assert.match(publicView, /p\.status = 'active'/);
  assert.doesNotMatch(publicView, /reviewer_email|token_hash|request_ip_hash|moderation_reason|moderated_by/);
  assert.match(migration, /revoke execute on function public\.submit_customer_review[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.submit_customer_review[\s\S]*to service_role/);
});

test("M12 migration enforces token, rate-limit, moderation, and rollback safety", () => {
  const migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");
  const rollback = readFileSync("supabase/rollbacks/202610290002_add_m12_verified_customer_reviews.down.sql", "utf8");
  assert.match(migration, /verification_token_hash text not null unique/);
  assert.match(migration, /verification_expires_at <= now\(\)/);
  assert.match(migration, /p_token_expires_at > now\(\) \+ interval '31 minutes'/i);
  assert.match(migration, /token_consumed_at is not null/);
  assert.match(migration, />= 5/);
  assert.match(migration, />= 3/);
  assert.match(migration, /status = 'pending-moderation'/);
  assert.match(migration, /disabled_at is null/);
  assert.match(rollback, /Cannot roll back M12 while customer reviews exist/);
});

test("email adapter and UI never claim service verification", () => {
  const email = readFileSync("src/reviews/reviewEmail.ts", "utf8");
  const form = readFileSync("app/mechanics/[providerId]/review-submission-form.tsx", "utf8");
  const adminAction = readFileSync("app/admin/reviews/actions.ts", "utf8");
  assert.match(email, /Authorization: `Bearer \$\{config\.apiKey\}`/);
  assert.match(email, /Email verification confirms email ownership only/);
  assert.doesNotMatch(email, /console\./);
  assert.match(form, /Service not independently verified|does not verify a purchase, completed repair, or service relationship/);
  assert.match(adminAction, /getAdminAuthorization/);
  assert.match(adminAction, /moderateCustomerReview/);
});
