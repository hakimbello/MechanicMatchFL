import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import type {
  AdminTrustWorkspace,
  ProviderWorkspace,
  SafetyIncidentInput
} from "./trustTypes.ts";

export interface TrustPersistence {
  getProviderWorkspace(userId: string): Promise<ProviderWorkspace>;
  submitProviderClaim(providerId: string, evidence: string): Promise<void>;
  submitProviderResponse(reviewId: string, responseText: string): Promise<void>;
  submitReviewDispute(reviewId: string, reason: string): Promise<void>;
  submitProviderAppeal(providerId: string, reason: string): Promise<void>;
  submitSafetyIncident(input: SafetyIncidentInput, ipHash: string, emailHash: string): Promise<"created" | "rate-limited" | "invalid">;
  getAdminWorkspace(admin: ProviderAdminIdentity): Promise<AdminTrustWorkspace>;
  reviewClaim(claimId: string, decision: "approved" | "rejected" | "disabled" | "revoked", reason: string): Promise<void>;
  moderateResponse(responseId: string, decision: "approved" | "rejected", reason: string): Promise<void>;
  updateDispute(disputeId: string, status: "reviewing" | "resolved" | "dismissed", reason: string): Promise<void>;
  updateSafetyIncident(incidentId: string, status: "investigating" | "resolved" | "dismissed", note: string): Promise<void>;
  suspendProvider(providerId: string, reason: string): Promise<void>;
  reinstateProvider(providerId: string, reason: string): Promise<void>;
  decideAppeal(appealId: string, decision: "granted" | "upheld" | "closed", reason: string): Promise<void>;
}

export class TrustPersistenceError extends Error {
  constructor(message = "Trust and safety operation failed.") {
    super(message);
    this.name = "TrustPersistenceError";
  }
}
