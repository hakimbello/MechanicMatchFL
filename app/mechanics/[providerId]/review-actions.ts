"use server";

import { headers } from "next/headers";

import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { getReviewRateLimitIdentity } from "../../../src/reviews/reviewRequestIdentity.ts";
import { submitCustomerReview, type SubmitReviewResult } from "../../../src/reviews/reviewService.ts";
import type { ReviewSubmissionInput } from "../../../src/reviews/reviewTypes.ts";

export async function submitCustomerReviewAction(input: ReviewSubmissionInput): Promise<SubmitReviewResult> {
  try {
    const requestHeaders = await headers();
    const rateLimitIdentity = getReviewRateLimitIdentity(requestHeaders);
    return await submitCustomerReview(input, rateLimitIdentity, getReviewPersistenceForRuntime());
  } catch {
    return { ok: false, formError: "Review submission is temporarily unavailable. Please try again later." };
  }
}
