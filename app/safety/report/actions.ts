"use server";

import { headers } from "next/headers";

import { getReviewRateLimitIdentity } from "../../../src/reviews/reviewRequestIdentity.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { submitSafetyIncident } from "../../../src/trust/trustService.ts";
import { getPublicMessages, localizeKnownMessage } from "../../../src/i18n/messages.ts";

export type SafetyReportState = { ok?: boolean; formError?: string; errors?: Record<string, string> };

export async function submitSafetyReportAction(_state: SafetyReportState, formData: FormData): Promise<SafetyReportState> {
  const locale = formData.get("locale") === "es" ? "es" : "en";
  try {
    const result = await submitSafetyIncident({
      providerId: String(formData.get("providerId") ?? ""),
      category: String(formData.get("category") ?? ""),
      description: String(formData.get("description") ?? ""),
      reporterName: String(formData.get("reporterName") ?? ""),
      reporterEmail: String(formData.get("reporterEmail") ?? ""),
      website: String(formData.get("website") ?? "")
    }, getReviewRateLimitIdentity(await headers()), getTrustPersistenceForRuntime());
    if (result.errors) {
      return { ...result, errors: Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key, localizeKnownMessage(value, locale) ?? value])) };
    }
    return result;
  } catch {
    return { ok: false, formError: getPublicMessages(locale).safety.unavailable };
  }
}
