"use server";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { moderateCustomerReview } from "../../../src/reviews/reviewService.ts";
import type { ReviewSubmissionRecord } from "../../../src/reviews/reviewTypes.ts";

export type AdminReviewActionResult = { ok: true; reviews: ReviewSubmissionRecord[] } | { ok: false; error: string };

export async function moderateCustomerReviewAction(reviewId: string, decision: "approved" | "rejected", reason: string): Promise<AdminReviewActionResult> {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok) return { ok: false, error: "You are not authorized to moderate reviews." };

  try {
    const persistence = getReviewPersistenceForRuntime();
    const result = await moderateCustomerReview({ reviewId, decision, reason }, authorization.admin, persistence);
    if (!result.ok) return result;
    return { ok: true, reviews: await persistence.listReviewsForAdmin(authorization.admin) };
  } catch {
    return { ok: false, error: "Review moderation could not be completed." };
  }
}
