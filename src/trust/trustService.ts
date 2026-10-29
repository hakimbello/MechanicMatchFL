import "server-only";

import { hashReviewAbuseValue } from "../reviews/reviewSecurity.ts";
import type { TrustPersistence } from "./trustPersistence.ts";
import type { SafetyIncidentInput } from "./trustTypes.ts";
import { validateClaimEvidence, validatePrivateReason, validateProviderResponse, validateSafetyIncident } from "./trustValidation.ts";

export async function submitProviderClaim(providerId: string, evidence: string, persistence: TrustPersistence) {
  const error = validateClaimEvidence(evidence);
  if (!providerId.trim() || error) return { ok: false as const, error: error ?? "Choose a provider." };
  await persistence.submitProviderClaim(providerId.trim(), evidence.trim());
  return { ok: true as const };
}

export async function submitProviderResponse(reviewId: string, responseText: string, persistence: TrustPersistence) {
  const error = validateProviderResponse(responseText);
  if (!reviewId.trim() || error) return { ok: false as const, error: error ?? "Choose a review." };
  await persistence.submitProviderResponse(reviewId.trim(), responseText.trim());
  return { ok: true as const };
}

export async function submitReviewDispute(reviewId: string, reason: string, persistence: TrustPersistence) {
  const error = validatePrivateReason(reason);
  if (!reviewId.trim() || error) return { ok: false as const, error: error ?? "Choose a review." };
  await persistence.submitReviewDispute(reviewId.trim(), reason.trim());
  return { ok: true as const };
}

export async function submitProviderAppeal(providerId: string, reason: string, persistence: TrustPersistence) {
  const error = validatePrivateReason(reason);
  if (!providerId.trim() || error) return { ok: false as const, error: error ?? "Choose a provider." };
  await persistence.submitProviderAppeal(providerId.trim(), reason.trim());
  return { ok: true as const };
}

export async function submitSafetyIncident(
  input: SafetyIncidentInput,
  requestIp: string,
  persistence: TrustPersistence,
  env: { REVIEW_ABUSE_HASH_KEY?: string } = process.env as { REVIEW_ABUSE_HASH_KEY?: string }
) {
  const errors = validateSafetyIncident(input);
  if (Object.keys(errors).length) return { ok: false as const, errors };
  const hashKey = env.REVIEW_ABUSE_HASH_KEY;
  if (!hashKey || hashKey.length < 32) return { ok: false as const, formError: "Safety reporting is temporarily unavailable." };
  const email = input.reporterEmail?.trim().toLowerCase() ?? "anonymous";
  const outcome = await persistence.submitSafetyIncident(
    { ...input, providerId: input.providerId?.trim() || undefined, reporterName: input.reporterName?.trim() || undefined, reporterEmail: input.reporterEmail?.trim().toLowerCase() || undefined, description: input.description.trim() },
    hashReviewAbuseValue(requestIp || "shared-unknown", hashKey),
    hashReviewAbuseValue(email, hashKey)
  );
  if (outcome === "rate-limited") return { ok: false as const, formError: "Too many reports were submitted. Please try again later." };
  if (outcome !== "created") return { ok: false as const, formError: "The report could not be accepted." };
  return { ok: true as const };
}
