"use server";

import { redirect } from "next/navigation";

import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { verifyCustomerReviewEmail } from "../../../src/reviews/reviewService.ts";

export async function verifyReviewEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  let outcome: "verified" | "expired" | "used" | "invalid" = "invalid";
  try {
    outcome = await verifyCustomerReviewEmail(token, getReviewPersistenceForRuntime());
  } catch {
    outcome = "invalid";
  }
  redirect(`/reviews/verify?status=${outcome}`);
}
