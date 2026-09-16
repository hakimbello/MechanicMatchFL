"use server";

import type { ProviderSubmissionInput } from "../../src/submissions/submissionTypes.ts";
import { getProviderPersistenceForRuntime } from "../../src/providers/runtimeProviderPersistence.ts";
import { submitProviderSubmission, type ProviderSubmissionServiceResult } from "../../src/submissions/providerSubmissionService.ts";

export async function submitProviderAction(input: ProviderSubmissionInput): Promise<ProviderSubmissionServiceResult> {
  try {
    return await submitProviderSubmission(input, getProviderPersistenceForRuntime());
  } catch {
    return {
      ok: false,
      formError: "Provider submission is temporarily unavailable. Please try again later."
    };
  }
}
