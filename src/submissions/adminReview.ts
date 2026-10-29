import type { ProviderStatus } from "../domain/providers.ts";
import { isPublicProviderStatus } from "./lifecycle.ts";
import type { ProviderSubmissionRecord } from "./submissionTypes.ts";

export interface AdminReviewView {
  id: string;
  businessName: string;
  providerType: string;
  status: ProviderStatus;
  relationship: string;
  authorization: string;
  contact: string;
  services: string[];
  vehicleCompatibility: string;
  location: string;
  experience: string;
  languages: string;
  description: string;
  registration: string;
  publicEligibility: "public" | "not-public";
}

export function buildAdminReviewView(record: ProviderSubmissionRecord): AdminReviewView {
  return {
    id: record.id,
    businessName: record.businessName,
    providerType: record.providerType,
    status: record.status,
    relationship: record.authorizationRelationship,
    authorization: record.authorizationAttested ? "Authorized attestation received" : "Missing attestation",
    contact: `${record.phone} / ${record.email}`,
    services: record.services,
    vehicleCompatibility: record.allMakes ? "All makes" : record.makesServiced?.join(", ") ?? "Selected makes",
    location:
      record.locationKind === "mobile"
        ? buildMobileServiceArea(record)
        : `${record.street}, ${record.city}, ${record.county} ${record.zip}`,
    experience: record.yearsExperience ? `${record.yearsExperience} years (provider-reported)` : "Not provided",
    languages: record.spokenLanguages?.length
      ? `${record.spokenLanguages.join(", ")} (provider-reported)`
      : "Not provided",
    description: record.description,
    registration: record.registration
      ? `${record.registration.value} (${record.registration.verificationStatus})`
      : "No registration submitted",
    publicEligibility: isPublicProviderStatus(record.status) ? "public" : "not-public"
  };
}

function buildMobileServiceArea(record: ProviderSubmissionRecord): string {
  const parts: string[] = [];
  if (record.serviceZipCodes?.length) {
    parts.push(`ZIP codes ${record.serviceZipCodes.join(", ")}`);
  }
  if (record.serviceBaseZip && record.serviceRadiusMiles) {
    parts.push(`${record.serviceRadiusMiles} miles from ${record.serviceBaseZip}`);
  }
  return `Mobile service area: ${parts.join("; ") || "Not provided"}`;
}
