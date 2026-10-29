import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import {
  ReviewPersistenceError,
  type CreateReviewOutcome,
  type CreateReviewRecordInput,
  type ReviewPersistence,
  type VerifyReviewOutcome
} from "./reviewPersistence.ts";
import type { PublicReview, PublicReviewAggregate, ReviewModerationInput, ReviewSubmissionRecord, ReviewStatus } from "./reviewTypes.ts";
import { createModerationAuthorizationHash } from "./reviewSecurity.ts";

type RpcResultRow = { outcome: string; review_id?: string | null; provider_name?: string | null };

export class SupabaseReviewPersistence implements ReviewPersistence {
  constructor(
    private readonly privilegedClient: SupabaseClient,
    private readonly publicClient: SupabaseClient = privilegedClient,
    private readonly authenticatedAdminClient?: SupabaseClient
  ) {}

  async createPendingReview(input: CreateReviewRecordInput) {
    const { data, error } = await this.privilegedClient.rpc("submit_customer_review", {
      p_provider_id: input.providerId,
      p_rating: input.rating,
      p_review_text: input.reviewText,
      p_reviewer_email: input.reviewerEmail,
      p_display_name: input.displayName ?? null,
      p_email_hash: input.emailHash,
      p_ip_hash: input.ipHash,
      p_token_hash: input.tokenHash,
      p_token_expires_at: input.verificationExpiresAt
    });
    const result = firstRpcRow(data);
    if (error || !result || !["created", "duplicate", "inactive-provider", "rate-limited", "invalid"].includes(result.outcome)) {
      throw new ReviewPersistenceError();
    }
    return {
      outcome: result.outcome as CreateReviewOutcome,
      reviewId: result.review_id ?? undefined,
      providerName: result.provider_name ?? undefined
    };
  }

  async markVerificationEmailSent(reviewId: string, tokenHash: string, deliveryId: string) {
    const { data, error } = await this.privilegedClient.rpc("mark_customer_review_email_sent", {
      p_review_id: reviewId,
      p_token_hash: tokenHash,
      p_delivery_id: deliveryId
    });
    if (error || data !== true) throw new ReviewPersistenceError();
  }

  async discardUndeliveredReview(reviewId: string, tokenHash: string) {
    const { error } = await this.privilegedClient.rpc("discard_undelivered_customer_review", {
      p_review_id: reviewId,
      p_token_hash: tokenHash
    });
    if (error) throw new ReviewPersistenceError();
  }

  async verifyReviewEmail(tokenHash: string): Promise<VerifyReviewOutcome> {
    const { data, error } = await this.privilegedClient.rpc("verify_customer_review_email", { p_token_hash: tokenHash });
    const outcome = typeof data === "string" ? data : firstRpcRow(data)?.outcome;
    if (error || !outcome || !["verified", "expired", "used", "invalid"].includes(outcome)) {
      throw new ReviewPersistenceError();
    }
    return outcome as VerifyReviewOutcome;
  }

  async listPublicReviews(providerId: string): Promise<PublicReview[]> {
    const { data, error } = await this.publicClient
      .from("approved_public_reviews")
      .select("id,provider_id,rating,review_text,reviewer_name,email_verified,published_at")
      .eq("provider_id", providerId)
      .order("published_at", { ascending: false });
    if (error || !data) throw new ReviewPersistenceError();
    return data.map((row) => ({
      id: String(row.id),
      providerId: String(row.provider_id),
      rating: Number(row.rating),
      reviewText: String(row.review_text),
      reviewerName: String(row.reviewer_name),
      emailVerified: true,
      publishedAt: String(row.published_at)
    }));
  }

  async getPublicReviewAggregate(providerId: string): Promise<PublicReviewAggregate | null> {
    const { data, error } = await this.publicClient
      .from("public_provider_review_aggregates")
      .select("provider_id,review_count,average_rating")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (error) throw new ReviewPersistenceError();
    return data
      ? { providerId: String(data.provider_id), reviewCount: Number(data.review_count), averageRating: Number(data.average_rating) }
      : null;
  }

  async listReviewsForAdmin(_admin: ProviderAdminIdentity): Promise<ReviewSubmissionRecord[]> {
    const { data, error } = await this.privilegedClient
      .from("customer_reviews")
      .select("id,provider_id,rating,review_text,reviewer_display_name,reviewer_email,status,verification_expires_at,verification_email_sent_at,email_verified_at,moderated_by,moderated_at,moderation_reason,published_at,created_at")
      .order("created_at", { ascending: false });
    if (error || !data) throw new ReviewPersistenceError();
    return data.map((row) => ({
      id: String(row.id), providerId: String(row.provider_id), rating: Number(row.rating), reviewText: String(row.review_text),
      reviewerEmail: String(row.reviewer_email), displayName: row.reviewer_display_name ? String(row.reviewer_display_name) : undefined,
      status: row.status as ReviewStatus, emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : undefined,
      verificationExpiresAt: String(row.verification_expires_at), verificationEmailSentAt: row.verification_email_sent_at ? String(row.verification_email_sent_at) : undefined,
      createdAt: String(row.created_at), moderatedAt: row.moderated_at ? String(row.moderated_at) : undefined,
      moderatedBy: row.moderated_by ? String(row.moderated_by) : undefined,
      moderationReason: row.moderation_reason ? String(row.moderation_reason) : undefined,
      publishedAt: row.published_at ? String(row.published_at) : undefined
    }));
  }

  async moderateReview(input: ReviewModerationInput, admin: ProviderAdminIdentity) {
    if (!this.authenticatedAdminClient) throw new ReviewPersistenceError();
    const authorizationHash = createModerationAuthorizationHash();
    const { error: authorizationError } = await this.authenticatedAdminClient
      .from("customer_review_moderation_authorizations")
      .insert({
        authorization_hash: authorizationHash,
        admin_user_id: admin.userId,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      });
    if (authorizationError) throw new ReviewPersistenceError();

    const { data, error } = await this.privilegedClient.rpc("moderate_customer_review", {
      p_review_id: input.reviewId,
      p_decision: input.decision,
      p_reason: input.reason.trim(),
      p_authorization_hash: authorizationHash
    });
    if (error || data !== true) throw new ReviewPersistenceError();
  }
}

function firstRpcRow(data: unknown): RpcResultRow | null {
  if (Array.isArray(data)) return (data[0] as RpcResultRow | undefined) ?? null;
  return data && typeof data === "object" ? (data as RpcResultRow) : null;
}
