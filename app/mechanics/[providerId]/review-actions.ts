"use server";

import { headers } from "next/headers";

import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { getReviewRateLimitIdentity } from "../../../src/reviews/reviewRequestIdentity.ts";
import { submitCustomerReview, type SubmitReviewResult } from "../../../src/reviews/reviewService.ts";
import type { ReviewSubmissionInput } from "../../../src/reviews/reviewTypes.ts";
import type { PublicLocale } from "../../../src/i18n/locale.ts";
import { getPublicMessages, localizeKnownMessage } from "../../../src/i18n/messages.ts";

export async function submitCustomerReviewAction(input: ReviewSubmissionInput, locale: PublicLocale = "en"): Promise<SubmitReviewResult> {
  try {
    const requestHeaders = await headers();
    const rateLimitIdentity = getReviewRateLimitIdentity(requestHeaders);
    const result = await submitCustomerReview(input, rateLimitIdentity, getReviewPersistenceForRuntime(), { locale });
    if (!result.ok && result.errors) {
      return { ...result, errors: Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key, localizeKnownMessage(value, locale)])) };
    }
    return result;
  } catch {
    return { ok: false, formError: getPublicMessages(locale).reviewForm.unavailable };
  }
}
