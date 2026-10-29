import "server-only";

import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import {
  createResendReviewEmailSender,
  getReviewDeliveryConfig,
  ReviewEmailConfigurationError,
  type ReviewEmailSender
} from "./reviewEmail.ts";
import type { ReviewPersistence, VerifyReviewOutcome } from "./reviewPersistence.ts";
import { createReviewVerificationToken, hashReviewAbuseValue, hashReviewVerificationToken } from "./reviewSecurity.ts";
import type { ReviewModerationInput, ReviewSubmissionFieldErrors, ReviewSubmissionInput } from "./reviewTypes.ts";
import { normalizeReviewerEmail, validateReviewSubmission } from "./reviewValidation.ts";

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; errors?: ReviewSubmissionFieldErrors; formError?: string };

export async function submitCustomerReview(
  input: ReviewSubmissionInput,
  requestIp: string,
  persistence: ReviewPersistence,
  options: { now?: Date; emailSender?: ReviewEmailSender; env?: NodeJS.ProcessEnv } = {}
): Promise<SubmitReviewResult> {
  const errors = validateReviewSubmission(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  let config;
  try {
    config = getReviewDeliveryConfig(options.env);
  } catch (error) {
    if (error instanceof ReviewEmailConfigurationError) {
      return { ok: false, formError: "Review email verification is not available yet. Please try again later." };
    }
    throw error;
  }

  const now = options.now ?? new Date();
  const email = normalizeReviewerEmail(input.reviewerEmail);
  const { token, tokenHash } = createReviewVerificationToken();
  const result = await persistence.createPendingReview({
    providerId: input.providerId.trim(),
    rating: input.rating,
    reviewText: input.reviewText.trim(),
    reviewerEmail: email,
    displayName: input.displayName.trim() || undefined,
    emailHash: hashReviewAbuseValue(email, config.abuseHashKey),
    ipHash: hashReviewAbuseValue(requestIp || "unknown", config.abuseHashKey),
    tokenHash,
    verificationExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  });

  if (result.outcome === "rate-limited") return { ok: false, formError: "Too many review attempts. Please try again later." };
  if (result.outcome === "duplicate") return { ok: false, formError: "A review for this provider could not be submitted again." };
  if (result.outcome === "inactive-provider") return { ok: false, formError: "This provider is not currently eligible for reviews." };
  if (result.outcome !== "created" || !result.reviewId || !result.providerName) {
    return { ok: false, formError: "Review submission could not be accepted." };
  }

  const verificationUrl = new URL("/reviews/verify", config.siteUrl);
  verificationUrl.searchParams.set("token", token);
  try {
    const sender = options.emailSender ?? createResendReviewEmailSender(config);
    const delivery = await sender.sendVerificationEmail({ recipient: email, providerName: result.providerName, verificationUrl: verificationUrl.toString() });
    await persistence.markVerificationEmailSent(result.reviewId, tokenHash, delivery.deliveryId);
  } catch {
    await persistence.discardUndeliveredReview(result.reviewId, tokenHash).catch(() => undefined);
    return { ok: false, formError: "The verification email could not be delivered. Please try again later." };
  }

  return { ok: true };
}

export async function verifyCustomerReviewEmail(token: string, persistence: ReviewPersistence): Promise<VerifyReviewOutcome> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return "invalid";
  return persistence.verifyReviewEmail(hashReviewVerificationToken(token));
}

export async function moderateCustomerReview(input: ReviewModerationInput, admin: ProviderAdminIdentity, persistence: ReviewPersistence) {
  const reason = input.reason.trim();
  if (!input.reviewId || !["approved", "rejected"].includes(input.decision) || reason.length < 10 || reason.length > 500) {
    return { ok: false as const, error: "Provide a moderation reason between 10 and 500 characters." };
  }
  await persistence.moderateReview({ ...input, reason }, admin);
  return { ok: true as const };
}
