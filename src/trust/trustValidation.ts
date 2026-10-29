import type { SafetyIncidentInput } from "./trustTypes.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClaimEvidence(value: string): string | null {
  const length = value.trim().length;
  return length >= 30 && length <= 2000 ? null : "Explain the ownership evidence in 30 to 2,000 characters.";
}

export function validateProviderResponse(value: string): string | null {
  const length = value.trim().length;
  return length >= 10 && length <= 1000 ? null : "Response must be between 10 and 1,000 characters.";
}

export function validatePrivateReason(value: string): string | null {
  const length = value.trim().length;
  return length >= 20 && length <= 2000 ? null : "Reason must be between 20 and 2,000 characters.";
}

export function validateSafetyIncident(input: SafetyIncidentInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.category || !["unsafe-work", "harassment", "fraud", "identity", "other"].includes(input.category)) {
    errors.category = "Choose an incident category.";
  }
  if (input.description.trim().length < 40 || input.description.trim().length > 4000) {
    errors.description = "Describe the incident in 40 to 4,000 characters.";
  }
  if (input.reporterName && input.reporterName.trim().length > 100) errors.reporterName = "Name is too long.";
  if (input.reporterEmail && (!EMAIL_PATTERN.test(input.reporterEmail.trim()) || input.reporterEmail.trim().length > 254)) {
    errors.reporterEmail = "Enter a valid email address or leave it blank.";
  }
  if (input.website) errors.website = "Submission could not be accepted.";
  return errors;
}
