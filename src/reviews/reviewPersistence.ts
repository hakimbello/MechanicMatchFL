import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import type {
  PublicReview,
  PublicReviewAggregate,
  ReviewModerationInput,
  ReviewSubmissionRecord
} from "./reviewTypes.ts";

export type CreateReviewOutcome = "created" | "duplicate" | "inactive-provider" | "rate-limited" | "invalid";
export type VerifyReviewOutcome = "verified" | "expired" | "used" | "invalid";

export interface CreateReviewRecordInput {
  providerId: string;
  rating: number;
  reviewText: string;
  reviewerEmail: string;
  displayName?: string;
  emailHash: string;
  ipHash: string;
  tokenHash: string;
  verificationExpiresAt: string;
}

export interface ReviewPersistence {
  createPendingReview(input: CreateReviewRecordInput): Promise<{ outcome: CreateReviewOutcome; reviewId?: string; providerName?: string }>;
  markVerificationEmailSent(reviewId: string, tokenHash: string, deliveryId: string): Promise<void>;
  discardUndeliveredReview(reviewId: string, tokenHash: string): Promise<void>;
  verifyReviewEmail(tokenHash: string): Promise<VerifyReviewOutcome>;
  listPublicReviews(providerId: string): Promise<PublicReview[]>;
  getPublicReviewAggregate(providerId: string): Promise<PublicReviewAggregate | null>;
  listReviewsForAdmin(admin: ProviderAdminIdentity): Promise<ReviewSubmissionRecord[]>;
  moderateReview(input: ReviewModerationInput, admin: ProviderAdminIdentity): Promise<void>;
}

export class ReviewPersistenceError extends Error {
  constructor() {
    super("Review persistence operation failed.");
    this.name = "ReviewPersistenceError";
  }
}

export class InMemoryReviewPersistence implements ReviewPersistence {
  private records: Array<ReviewSubmissionRecord & { tokenHash: string; deliveryId?: string }> = [];
  private readonly activeProviders: Map<string, string>;
  private readonly attempts: Array<{ emailHash: string; ipHash: string; createdAt: number }> = [];

  constructor(activeProviders: Record<string, string> = {}) {
    this.activeProviders = new Map(Object.entries(activeProviders));
  }

  async createPendingReview(input: CreateReviewRecordInput) {
    const providerName = this.activeProviders.get(input.providerId);
    if (!providerName) {
      return { outcome: "inactive-provider" as const };
    }
    const now = Date.now();
    if (
      this.attempts.filter((attempt) => attempt.ipHash === input.ipHash && attempt.createdAt > now - 60 * 60 * 1000).length >= 5 ||
      this.attempts.filter((attempt) => attempt.emailHash === input.emailHash && attempt.createdAt > now - 24 * 60 * 60 * 1000).length >= 3
    ) {
      return { outcome: "rate-limited" as const };
    }
    this.attempts.push({ emailHash: input.emailHash, ipHash: input.ipHash, createdAt: now });
    if (this.records.some((record) => record.providerId === input.providerId && record.reviewerEmail === input.reviewerEmail)) {
      return { outcome: "duplicate" as const };
    }
    const id = `review-${this.records.length + 1}`;
    this.records.push({
      id,
      providerId: input.providerId,
      rating: input.rating,
      reviewText: input.reviewText,
      reviewerEmail: input.reviewerEmail,
      displayName: input.displayName,
      status: "pending-email",
      verificationExpiresAt: input.verificationExpiresAt,
      createdAt: new Date(now).toISOString(),
      tokenHash: input.tokenHash
    });
    return { outcome: "created" as const, reviewId: id, providerName };
  }

  async markVerificationEmailSent(reviewId: string, tokenHash: string, deliveryId: string) {
    const record = this.records.find((item) => item.id === reviewId && item.tokenHash === tokenHash);
    if (!record) throw new ReviewPersistenceError();
    record.verificationEmailSentAt = new Date().toISOString();
    record.deliveryId = deliveryId;
  }

  async discardUndeliveredReview(reviewId: string, tokenHash: string) {
    this.records = this.records.filter(
      (item) => item.id !== reviewId || item.tokenHash !== tokenHash || Boolean(item.verificationEmailSentAt)
    );
  }

  async verifyReviewEmail(tokenHash: string): Promise<VerifyReviewOutcome> {
    const record = this.records.find((item) => item.tokenHash === tokenHash);
    if (!record) return "invalid";
    if (record.emailVerifiedAt) return "used";
    if (new Date(record.verificationExpiresAt).getTime() <= Date.now()) return "expired";
    if (!record.verificationEmailSentAt) return "invalid";
    record.emailVerifiedAt = new Date().toISOString();
    record.status = "pending-moderation";
    return "verified";
  }

  async listPublicReviews(providerId: string): Promise<PublicReview[]> {
    return this.records
      .filter((record) => record.providerId === providerId && record.status === "approved" && record.publishedAt)
      .map((record) => ({
        id: record.id,
        providerId: record.providerId,
        rating: record.rating,
        reviewText: record.reviewText,
        reviewerName: record.displayName || "Anonymous",
        emailVerified: true,
        publishedAt: record.publishedAt!
      }));
  }

  async getPublicReviewAggregate(providerId: string): Promise<PublicReviewAggregate | null> {
    const reviews = await this.listPublicReviews(providerId);
    return reviews.length
      ? { providerId, reviewCount: reviews.length, averageRating: reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length }
      : null;
  }

  async listReviewsForAdmin(): Promise<ReviewSubmissionRecord[]> {
    return this.records.map(({ tokenHash: _tokenHash, deliveryId: _deliveryId, ...record }) => record);
  }

  async moderateReview(input: ReviewModerationInput, admin: ProviderAdminIdentity): Promise<void> {
    const record = this.records.find((item) => item.id === input.reviewId);
    if (!record || record.status !== "pending-moderation" || input.reason.trim().length < 10) {
      throw new ReviewPersistenceError();
    }
    record.status = input.decision;
    record.moderatedAt = new Date().toISOString();
    record.moderatedBy = admin.userId;
    record.moderationReason = input.reason.trim();
    record.publishedAt = input.decision === "approved" ? record.moderatedAt : undefined;
  }
}
