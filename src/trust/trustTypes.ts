export type ProviderClaimStatus = "pending" | "approved" | "rejected" | "disabled" | "revoked";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type SafetyIncidentStatus = "new" | "investigating" | "resolved" | "dismissed";
export type AppealStatus = "pending" | "granted" | "upheld" | "closed";

export interface ProviderClaimRecord {
  id: string;
  providerId: string;
  authUserId: string;
  status: ProviderClaimStatus;
  evidence: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewReason?: string;
}

export interface ProviderReviewResponseRecord {
  id: string;
  reviewId: string;
  providerId: string;
  responseText: string;
  status: ModerationStatus;
  submittedAt: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface ReviewDisputeRecord {
  id: string;
  reviewId: string;
  providerId: string;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
}

export interface SafetyIncidentRecord {
  id: string;
  providerId?: string;
  category: string;
  description: string;
  reporterName?: string;
  reporterEmail?: string;
  status: SafetyIncidentStatus;
  createdAt: string;
}

export interface ProviderSuspensionRecord {
  id: string;
  providerId: string;
  status: "active" | "reinstated";
  reason: string;
  createdAt: string;
  reinstatedAt?: string;
}

export interface ProviderAppealRecord {
  id: string;
  providerId: string;
  suspensionId: string;
  reason: string;
  status: AppealStatus;
  createdAt: string;
  decisionReason?: string;
}

export interface ProviderWorkspace {
  claims: ProviderClaimRecord[];
  responses: ProviderReviewResponseRecord[];
  disputes: ReviewDisputeRecord[];
  appeals: ProviderAppealRecord[];
  eligibleReviews: Array<{ id: string; providerId: string; rating: number; reviewText: string }>;
}

export interface AdminTrustWorkspace extends ProviderWorkspace {
  safetyIncidents: SafetyIncidentRecord[];
  suspensions: ProviderSuspensionRecord[];
}

export interface SafetyIncidentInput {
  providerId?: string;
  category: string;
  description: string;
  reporterName?: string;
  reporterEmail?: string;
  website?: string;
}
