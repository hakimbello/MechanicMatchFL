import type { LocationKind, ProviderType } from "../domain/providers.ts";
import type { ProviderPersistence } from "../providers/providerPersistence.ts";
import type { ProviderSubmissionInput, SubmissionFieldErrors } from "./submissionTypes.ts";
import { createSubmittedProviderRecord } from "./validation.ts";

export type ProviderSubmissionServiceResult =
  | { ok: true; businessName: string; providerType: ProviderType; locationKind: LocationKind }
  | { ok: false; errors?: SubmissionFieldErrors; formError?: string };

export async function submitProviderSubmission(
  input: ProviderSubmissionInput,
  persistence: ProviderPersistence,
  now: Date = new Date()
): Promise<ProviderSubmissionServiceResult> {
  const recordResult = createSubmittedProviderRecord(input, now);

  if (!recordResult.ok) {
    return { ok: false, errors: recordResult.errors };
  }

  try {
    const saved = await persistence.createProviderSubmission(recordResult.record);
    return {
      ok: true,
      businessName: saved.businessName,
      providerType: saved.providerType,
      locationKind: saved.locationKind
    };
  } catch {
    return {
      ok: false,
      formError: "Provider submission is temporarily unavailable. Please try again later."
    };
  }
}
