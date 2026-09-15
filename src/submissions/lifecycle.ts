import type { ProviderStatus } from "../domain/providers.ts";
import type { ProviderSubmissionRecord } from "./submissionTypes.ts";

export const ALLOWED_PROVIDER_TRANSITIONS: Partial<Record<ProviderStatus, ProviderStatus[]>> = {
  draft: ["submitted"],
  submitted: ["under-review"],
  "under-review": ["approved", "changes-requested", "rejected"],
  approved: ["active"],
  active: ["deactivated"]
};

export function canTransitionProviderStatus(from: ProviderStatus, to: ProviderStatus): boolean {
  return ALLOWED_PROVIDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionProviderSubmission(
  record: ProviderSubmissionRecord,
  nextStatus: ProviderStatus,
  now: Date = new Date()
): ProviderSubmissionRecord {
  if (!canTransitionProviderStatus(record.status, nextStatus)) {
    throw new Error(`Provider status cannot move from ${record.status} to ${nextStatus}.`);
  }

  return {
    ...record,
    status: nextStatus,
    updatedAt: now.toISOString()
  };
}

export function isPublicProviderStatus(status: ProviderStatus): boolean {
  return status === "active";
}
