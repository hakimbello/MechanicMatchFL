import type { Provider } from "../domain/providers.ts";
import type { ProviderSubmissionRecord } from "./submissionTypes.ts";
import { isPublicProviderStatus } from "./lifecycle.ts";

export function isPublicProvider(provider: Pick<Provider, "status"> | Pick<ProviderSubmissionRecord, "status">): boolean {
  return isPublicProviderStatus(provider.status);
}

export function convertSubmissionToProvider(record: ProviderSubmissionRecord): Provider | null {
  if (!isPublicProvider(record)) {
    return null;
  }

  return {
    id: record.id,
    name: record.businessName,
    type: record.providerType,
    status: "active",
    locationKind: record.locationKind,
    address:
      record.locationKind === "physical"
        ? {
            street: record.street ?? "",
            city: record.city ?? "",
            county: record.county ?? "Miami-Dade",
            zip: record.zip ?? ""
          }
        : undefined,
    mobileServiceArea:
      record.locationKind === "mobile"
        ? {
            zipCodes: record.serviceZipCodes,
            counties: record.serviceCounties
          }
        : undefined,
    services: record.services,
    allMakes: record.allMakes,
    makesServiced: record.makesServiced,
    specialtyMakes: record.specialtyMakes,
    contact: {
      phone: record.phone,
      email: record.email
    },
    description: record.description,
    profileImageRef: record.profileImageRef,
    trust: {
      claimedProfile: false,
      verified: false
    }
  };
}
