export const REVIEW_STATUSES = ["pending-email", "pending-moderation", "approved", "rejected"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface ReviewSubmissionInput {
  providerId: string;
  rating: number;
  reviewText: string;
  reviewerEmail: string;
  displayName: string;
  website?: string;
}

export type ReviewSubmissionFieldErrors = Partial<Record<keyof ReviewSubmissionInput, string>>;

export interface ReviewSubmissionRecord {
  id: string;
  providerId: string;
  rating: number;
  reviewText: string;
  reviewerEmail: string;
  displayName?: string;
  status: ReviewStatus;
  emailVerifiedAt?: string;
  verificationExpiresAt: string;
  verificationEmailSentAt?: string;
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
  moderationReason?: string;
  publishedAt?: string;
}

export interface PublicReview {
  id: string;
  providerId: string;
  rating: number;
  reviewText: string;
  reviewerName: string;
  emailVerified: true;
  publishedAt: string;
}

export interface PublicReviewAggregate {
  providerId: string;
  reviewCount: number;
  averageRating: number;
}

export interface ReviewModerationInput {
  reviewId: string;
  decision: "approved" | "rejected";
  reason: string;
}
