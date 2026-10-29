"use server";

import { headers } from "next/headers";

import { getReviewRateLimitIdentity } from "../../../src/reviews/reviewRequestIdentity.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { submitSafetyIncident } from "../../../src/trust/trustService.ts";

export type SafetyReportState = { ok?: boolean; formError?: string; errors?: Record<string, string> };

export async function submitSafetyReportAction(_state: SafetyReportState, formData: FormData): Promise<SafetyReportState> {
  try {
    return await submitSafetyIncident({
      providerId: String(formData.get("providerId") ?? ""),
      category: String(formData.get("category") ?? ""),
      description: String(formData.get("description") ?? ""),
      reporterName: String(formData.get("reporterName") ?? ""),
      reporterEmail: String(formData.get("reporterEmail") ?? ""),
      website: String(formData.get("website") ?? "")
    }, getReviewRateLimitIdentity(await headers()), getTrustPersistenceForRuntime());
  } catch {
    return { ok: false, formError: "The confidential report could not be submitted." };
  }
}
