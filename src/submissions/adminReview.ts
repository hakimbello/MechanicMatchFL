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
        ? `Mobile service area: ${(record.serviceZipCodes ?? []).join(", ") || (record.serviceCounties ?? []).join(", ")}`
        : `${record.street}, ${record.city}, ${record.county} ${record.zip}`,
    description: record.description,
    registration: record.registration
      ? `${record.registration.value} (${record.registration.verificationStatus})`
      : "No registration submitted",
    publicEligibility: isPublicProviderStatus(record.status) ? "public" : "not-public"
  };
}
