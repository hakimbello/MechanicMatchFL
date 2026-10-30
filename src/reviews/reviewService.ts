import "server-only";

import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import { deliverReviewVerification } from "./reviewDelivery.ts";
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
import { getPublicMessages } from "../i18n/messages.ts";
import type { PublicLocale } from "../i18n/locale.ts";

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; errors?: ReviewSubmissionFieldErrors; formError?: string };

export async function submitCustomerReview(
  input: ReviewSubmissionInput,
  requestIp: string,
  persistence: ReviewPersistence,
  options: { now?: Date; emailSender?: ReviewEmailSender; env?: NodeJS.ProcessEnv; locale?: PublicLocale } = {}
): Promise<SubmitReviewResult> {
  const locale = options.locale ?? "en";
  const messages = getPublicMessages(locale).reviewForm;
  const errors = validateReviewSubmission(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  let config;
  try {
    config = getReviewDeliveryConfig(options.env);
  } catch (error) {
    if (error instanceof ReviewEmailConfigurationError) {
      return { ok: false, formError: messages.emailUnavailable };
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

  if (result.outcome === "rate-limited") return { ok: false, formError: messages.rateLimited };
  if (result.outcome === "duplicate") return { ok: false, formError: messages.duplicate };
  if (result.outcome === "inactive-provider") return { ok: false, formError: messages.inactiveProvider };
  if (result.outcome !== "created" || !result.reviewId || !result.providerName) {
    return { ok: false, formError: getPublicMessages(locale).validation.reviewRejected };
  }

  const verificationUrl = new URL(locale === "es" ? "/es/reviews/verify" : "/reviews/verify", config.siteUrl);
  verificationUrl.hash = `token=${token}`;
  const sender = options.emailSender ?? createResendReviewEmailSender(config);
  const delivered = await deliverReviewVerification(
    result.reviewId,
    tokenHash,
    {
      recipient: email,
      providerName: result.providerName,
      verificationUrl: verificationUrl.toString(),
      idempotencyKey: `review-verification-${tokenHash}`,
      locale
    },
    sender,
    persistence
  );
  if (!delivered) {
    return { ok: false, formError: messages.deliveryFailed };
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
