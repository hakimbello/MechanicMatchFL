import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import { TrustPersistenceError, type TrustPersistence } from "./trustPersistence.ts";
import type {
  AdminTrustWorkspace,
  ProviderAppealRecord,
  ProviderClaimRecord,
  ProviderReviewResponseRecord,
  ProviderSuspensionRecord,
  ProviderWorkspace,
  ReviewDisputeRecord,
  SafetyIncidentInput,
  SafetyIncidentRecord
} from "./trustTypes.ts";

export class SupabaseTrustPersistence implements TrustPersistence {
  constructor(
    private readonly privilegedClient: SupabaseClient,
    private readonly authenticatedClient?: SupabaseClient
  ) {}

  async getProviderWorkspace(userId: string): Promise<ProviderWorkspace> {
    const { data: claimRows, error: claimError } = await this.privilegedClient
      .from("provider_claims")
      .select("id,provider_id,auth_user_id,status,evidence,submitted_at,reviewed_at,review_reason")
      .eq("auth_user_id", userId)
      .order("submitted_at", { ascending: false });
    if (claimError || !claimRows) throw new TrustPersistenceError();
    const providerIds = [...new Set(claimRows.filter((row) => row.status === "approved").map((row) => String(row.provider_id)))];
    if (!providerIds.length) return { claims: [], responses: [], disputes: [], appeals: [], eligibleReviews: [] };

    const [responses, disputes, appeals, reviews] = await Promise.all([
      this.privilegedClient.from("provider_review_responses").select("id,review_id,provider_id,response_text,status,submitted_at,moderated_at,moderation_reason").in("provider_id", providerIds).order("submitted_at", { ascending: false }),
      this.privilegedClient.from("provider_review_disputes").select("id,review_id,provider_id,reason,status,created_at").in("provider_id", providerIds).order("created_at", { ascending: false }),
      this.privilegedClient.from("provider_suspension_appeals").select("id,provider_id,suspension_id,reason,status,created_at,decision_reason").in("provider_id", providerIds).order("created_at", { ascending: false }),
      this.privilegedClient.from("customer_reviews").select("id,provider_id,rating,review_text").in("provider_id", providerIds).eq("status", "approved").order("published_at", { ascending: false })
    ]);
    if (responses.error || disputes.error || appeals.error || reviews.error) throw new TrustPersistenceError();
    return {
      claims: claimRows.map(mapClaim),
      responses: (responses.data ?? []).map(mapResponse),
      disputes: (disputes.data ?? []).map(mapDispute),
      appeals: (appeals.data ?? []).map(mapAppeal),
      eligibleReviews: (reviews.data ?? []).map((row) => ({ id: String(row.id), providerId: String(row.provider_id), rating: Number(row.rating), reviewText: String(row.review_text) }))
    };
  }

  async submitProviderClaim(providerId: string, evidence: string) {
    await this.callAuthenticated("submit_provider_claim", { p_provider_id: providerId, p_evidence: evidence });
  }

  async submitProviderResponse(reviewId: string, responseText: string) {
    await this.callAuthenticated("submit_provider_review_response", { p_review_id: reviewId, p_response_text: responseText });
  }

  async submitReviewDispute(reviewId: string, reason: string) {
    await this.callAuthenticated("submit_provider_review_dispute", { p_review_id: reviewId, p_reason: reason });
  }

  async submitProviderAppeal(providerId: string, reason: string) {
    await this.callAuthenticated("submit_provider_suspension_appeal", { p_provider_id: providerId, p_reason: reason });
  }

  async submitSafetyIncident(input: SafetyIncidentInput, ipHash: string, emailHash: string) {
    const { data, error } = await this.privilegedClient.rpc("submit_safety_incident", {
      p_provider_id: input.providerId || null,
      p_category: input.category,
      p_description: input.description,
      p_reporter_name: input.reporterName || null,
      p_reporter_email: input.reporterEmail || null,
      p_ip_hash: ipHash,
      p_email_hash: emailHash
    });
    if (error || !["created", "rate-limited", "invalid"].includes(String(data))) throw new TrustPersistenceError();
    return String(data) as "created" | "rate-limited" | "invalid";
  }

  async getAdminWorkspace(_admin: ProviderAdminIdentity): Promise<AdminTrustWorkspace> {
    const [claims, responses, disputes, appeals, incidents, suspensions] = await Promise.all([
      this.privilegedClient.from("provider_claims").select("id,provider_id,auth_user_id,status,evidence,submitted_at,reviewed_at,review_reason").order("submitted_at", { ascending: false }),
      this.privilegedClient.from("provider_review_responses").select("id,review_id,provider_id,response_text,status,submitted_at,moderated_at,moderation_reason").order("submitted_at", { ascending: false }),
      this.privilegedClient.from("provider_review_disputes").select("id,review_id,provider_id,reason,status,created_at").order("created_at", { ascending: false }),
      this.privilegedClient.from("provider_suspension_appeals").select("id,provider_id,suspension_id,reason,status,created_at,decision_reason").order("created_at", { ascending: false }),
      this.privilegedClient.from("safety_incidents").select("id,provider_id,category,description,reporter_name,reporter_email,status,created_at").order("created_at", { ascending: false }),
      this.privilegedClient.from("provider_suspensions").select("id,provider_id,status,reason,created_at,reinstated_at").order("created_at", { ascending: false })
    ]);
    if ([claims, responses, disputes, appeals, incidents, suspensions].some((result) => result.error)) throw new TrustPersistenceError();
    return {
      claims: (claims.data ?? []).map(mapClaim),
      responses: (responses.data ?? []).map(mapResponse),
      disputes: (disputes.data ?? []).map(mapDispute),
      appeals: (appeals.data ?? []).map(mapAppeal),
      eligibleReviews: [],
      safetyIncidents: (incidents.data ?? []).map(mapSafetyIncident),
      suspensions: (suspensions.data ?? []).map(mapSuspension)
    };
  }

  reviewClaim(claimId: string, decision: "approved" | "rejected" | "disabled" | "revoked", reason: string) {
    return this.callAuthenticated("admin_review_provider_claim", { p_claim_id: claimId, p_decision: decision, p_reason: reason });
  }
  moderateResponse(responseId: string, decision: "approved" | "rejected", reason: string) {
    return this.callAuthenticated("admin_moderate_provider_response", { p_response_id: responseId, p_decision: decision, p_reason: reason });
  }
  updateDispute(disputeId: string, status: "reviewing" | "resolved" | "dismissed", reason: string) {
    return this.callAuthenticated("admin_update_provider_dispute", { p_dispute_id: disputeId, p_status: status, p_reason: reason });
  }
  updateSafetyIncident(incidentId: string, status: "investigating" | "resolved" | "dismissed", note: string) {
    return this.callAuthenticated("admin_update_safety_incident", { p_incident_id: incidentId, p_status: status, p_note: note });
  }
  suspendProvider(providerId: string, reason: string) {
    return this.callAuthenticated("admin_suspend_provider", { p_provider_id: providerId, p_reason: reason });
  }
  reinstateProvider(providerId: string, reason: string) {
    return this.callAuthenticated("admin_reinstate_provider", { p_provider_id: providerId, p_reason: reason });
  }
  decideAppeal(appealId: string, decision: "granted" | "upheld" | "closed", reason: string) {
    return this.callAuthenticated("admin_decide_provider_appeal", { p_appeal_id: appealId, p_decision: decision, p_reason: reason });
  }

  private async callAuthenticated(functionName: string, parameters: Record<string, unknown>): Promise<void> {
    if (!this.authenticatedClient) throw new TrustPersistenceError();
    const { data, error } = await this.authenticatedClient.rpc(functionName, parameters);
    if (error || data !== true) throw new TrustPersistenceError();
  }
}

type Row = Record<string, unknown>;
const optional = (value: unknown) => value == null ? undefined : String(value);
function mapClaim(row: Row): ProviderClaimRecord { return { id: String(row.id), providerId: String(row.provider_id), authUserId: String(row.auth_user_id), status: row.status as ProviderClaimRecord["status"], evidence: String(row.evidence), submittedAt: String(row.submitted_at), reviewedAt: optional(row.reviewed_at), reviewReason: optional(row.review_reason) }; }
function mapResponse(row: Row): ProviderReviewResponseRecord { return { id: String(row.id), reviewId: String(row.review_id), providerId: String(row.provider_id), responseText: String(row.response_text), status: row.status as ProviderReviewResponseRecord["status"], submittedAt: String(row.submitted_at), moderatedAt: optional(row.moderated_at), moderationReason: optional(row.moderation_reason) }; }
function mapDispute(row: Row): ReviewDisputeRecord { return { id: String(row.id), reviewId: String(row.review_id), providerId: String(row.provider_id), reason: String(row.reason), status: row.status as ReviewDisputeRecord["status"], createdAt: String(row.created_at) }; }
function mapAppeal(row: Row): ProviderAppealRecord { return { id: String(row.id), providerId: String(row.provider_id), suspensionId: String(row.suspension_id), reason: String(row.reason), status: row.status as ProviderAppealRecord["status"], createdAt: String(row.created_at), decisionReason: optional(row.decision_reason) }; }
function mapSafetyIncident(row: Row): SafetyIncidentRecord { return { id: String(row.id), providerId: optional(row.provider_id), category: String(row.category), description: String(row.description), reporterName: optional(row.reporter_name), reporterEmail: optional(row.reporter_email), status: row.status as SafetyIncidentRecord["status"], createdAt: String(row.created_at) }; }
function mapSuspension(row: Row): ProviderSuspensionRecord { return { id: String(row.id), providerId: String(row.provider_id), status: row.status as ProviderSuspensionRecord["status"], reason: String(row.reason), createdAt: String(row.created_at), reinstatedAt: optional(row.reinstated_at) }; }
