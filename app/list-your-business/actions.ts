"use server";

import type { ProviderSubmissionInput } from "../../src/submissions/submissionTypes.ts";
import { getProviderPersistenceForRuntime } from "../../src/providers/runtimeProviderPersistence.ts";
import { submitProviderSubmission, type ProviderSubmissionServiceResult } from "../../src/submissions/providerSubmissionService.ts";
import type { PublicLocale } from "../../src/i18n/locale.ts";
import { getPublicMessages, localizeKnownMessage } from "../../src/i18n/messages.ts";

export async function submitProviderAction(input: ProviderSubmissionInput, locale: PublicLocale = "en"): Promise<ProviderSubmissionServiceResult> {
  try {
    const result = await submitProviderSubmission(input, getProviderPersistenceForRuntime());
    if (!result.ok && result.errors) {
      return { ...result, errors: Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key, localizeKnownMessage(value, locale)])) };
    }
    if (!result.ok && result.formError && locale === "es") return { ...result, formError: getPublicMessages(locale).listing.unavailable };
    return result;
  } catch {
    return {
      ok: false,
      formError: getPublicMessages(locale).listing.unavailable
    };
  }
}
