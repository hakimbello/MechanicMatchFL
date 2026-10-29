"use server";

import { headers } from "next/headers";

import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { submitCustomerReview, type SubmitReviewResult } from "../../../src/reviews/reviewService.ts";
import type { ReviewSubmissionInput } from "../../../src/reviews/reviewTypes.ts";

export async function submitCustomerReviewAction(input: ReviewSubmissionInput): Promise<SubmitReviewResult> {
  try {
    const requestHeaders = await headers();
    const requestIp = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "unknown";
    return await submitCustomerReview(input, requestIp, getReviewPersistenceForRuntime());
  } catch {
    return { ok: false, formError: "Review submission is temporarily unavailable. Please try again later." };
  }
}
