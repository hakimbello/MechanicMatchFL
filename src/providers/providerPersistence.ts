import type { Provider, ProviderStatus } from "../domain/providers.ts";
import { canTransitionProviderStatus } from "../submissions/lifecycle.ts";
import { convertSubmissionToProvider } from "../submissions/publication.ts";
import type { ProviderSubmissionRecord, SubmittedRegistration } from "../submissions/submissionTypes.ts";

export interface ProviderAdminIdentity {
  userId: string;
}

export interface ProviderPersistence {
  createProviderSubmission(record: ProviderSubmissionRecord): Promise<ProviderSubmissionRecord>;
  listProviderSubmissionsForAdmin(admin: ProviderAdminIdentity): Promise<ProviderSubmissionRecord[]>;
  getProviderSubmissionForAdmin(id: string, admin: ProviderAdminIdentity): Promise<ProviderSubmissionRecord | null>;
  transitionProviderStatus(
    id: string,
    status: ProviderStatus,
    admin: ProviderAdminIdentity
  ): Promise<ProviderSubmissionRecord>;
  listActivePublicProviders(): Promise<Provider[]>;
  getActivePublicProviderById(id: string): Promise<Provider | null>;
}

export class ProviderPersistenceError extends Error {
  constructor(message = "Provider persistence operation failed.") {
    super(message);
    this.name = "ProviderPersistenceError";
  }
}

export interface ProviderRecordRow {
  id: string;
  status: ProviderStatus;
  business_name: string;
  provider_type: ProviderSubmissionRecord["providerType"];
  location_kind: ProviderSubmissionRecord["locationKind"];
  phone: string;
  email: string;
  website?: string | null;
  services: ProviderSubmissionRecord["services"];
  all_makes: boolean;
  makes_serviced?: string[] | null;
  specialty_makes?: string[] | null;
  street?: string | null;
  city?: string | null;
  county?: ProviderSubmissionRecord["county"] | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_zip_codes?: string[] | null;
  service_counties?: ProviderSubmissionRecord["serviceCounties"] | null;
  service_base_zip?: string | null;
  service_radius_miles?: number | null;
  service_base_latitude?: number | null;
  service_base_longitude?: number | null;
  description: string;
  profile_image_ref?: string | null;
  registration_value?: string | null;
  registration_verification_status?: SubmittedRegistration["verificationStatus"] | null;
  authorization_relationship: ProviderSubmissionRecord["authorizationRelationship"];
  authorization_attested: boolean;
  submitted_at: string;
  updated_at: string;
  admin_notes?: string | null;
  last_reviewed_by?: string | null;
}

export type ProviderRecordInsertRow = Omit<
  ProviderRecordRow,
  "website" | "latitude" | "longitude" | "service_base_zip" | "service_radius_miles" | "service_base_latitude" | "service_base_longitude" | "admin_notes" | "last_reviewed_by"
>;

export type PublicProviderRow = Pick<
  ProviderRecordRow,
  | "id"
  | "status"
  | "provider_type"
  | "location_kind"
  | "phone"
  | "email"
  | "website"
  | "services"
  | "all_makes"
  | "makes_serviced"
  | "specialty_makes"
  | "street"
  | "city"
  | "county"
  | "zip"
  | "latitude"
  | "longitude"
  | "service_zip_codes"
  | "service_counties"
  | "service_base_zip"
  | "service_radius_miles"
  | "service_base_latitude"
  | "service_base_longitude"
  | "description"
> & {
  name: string;
  claimed_profile: boolean;
  verified: boolean;
  verified_at?: string | null;
};

export const PUBLIC_PROVIDER_ROW_FIELDS = [
  "id",
  "name",
  "provider_type",
  "status",
  "location_kind",
  "phone",
  "email",
  "website",
  "services",
  "all_makes",
  "makes_serviced",
  "specialty_makes",
  "street",
  "city",
  "county",
  "zip",
  "latitude",
  "longitude",
  "service_zip_codes",
  "service_counties",
  "service_base_zip",
  "service_radius_miles",
  "service_base_latitude",
  "service_base_longitude",
  "description",
  "claimed_profile",
  "verified",
  "verified_at"
] as const;

export function mapSubmissionToProviderRecordInsert(record: ProviderSubmissionRecord): ProviderRecordInsertRow {
  return {
    id: record.id,
    status: record.status,
    business_name: record.businessName,
    provider_type: record.providerType,
    location_kind: record.locationKind,
    phone: record.phone,
    email: record.email,
    services: record.services,
    all_makes: record.allMakes,
    makes_serviced: record.makesServiced ?? [],
    specialty_makes: record.specialtyMakes ?? [],
    street: record.street ?? null,
    city: record.city ?? null,
    county: record.county ?? null,
    zip: record.zip ?? null,
    service_zip_codes: record.serviceZipCodes ?? [],
    service_counties: record.serviceCounties ?? [],
    description: record.description,
    profile_image_ref: null,
    registration_value: record.registration?.value ?? null,
    registration_verification_status: record.registration?.verificationStatus ?? null,
    authorization_relationship: record.authorizationRelationship,
    authorization_attested: record.authorizationAttested,
    submitted_at: record.submittedAt,
    updated_at: record.updatedAt
  };
}

export function mapProviderRecordRowToSubmission(row: ProviderRecordRow): ProviderSubmissionRecord {
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    businessName: row.business_name,
    phone: row.phone,
    email: row.email,
    providerType: row.provider_type,
    locationKind: row.location_kind,
    street: row.street ?? undefined,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    zip: row.zip ?? undefined,
    serviceZipCodes: row.service_zip_codes ?? [],
    serviceCounties: row.service_counties ?? [],
    services: row.services,
    allMakes: row.all_makes,
    makesServiced: row.makes_serviced ?? undefined,
    specialtyMakes: row.specialty_makes ?? undefined,
    description: row.description,
    profileImageRef: undefined,
    registration:
      row.registration_value && row.registration_verification_status
        ? { value: row.registration_value, verificationStatus: row.registration_verification_status }
        : undefined,
    authorizationRelationship: row.authorization_relationship,
    authorizationAttested: row.authorization_attested
  };
}

export function mapPublicProviderRowToProvider(row: PublicProviderRow): Provider | null {
  if (row.status !== "active") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    type: row.provider_type,
    status: "active",
    locationKind: row.location_kind,
    address:
      row.location_kind === "physical"
        ? {
            street: row.street ?? "",
            city: row.city ?? "",
            county: row.county ?? "Miami-Dade",
            zip: row.zip ?? "",
            coordinates:
              typeof row.latitude === "number" && typeof row.longitude === "number"
                ? { latitude: row.latitude, longitude: row.longitude }
                : undefined
          }
        : undefined,
    mobileServiceArea:
      row.location_kind === "mobile"
        ? {
            zipCodes: row.service_zip_codes ?? [],
            counties: row.service_counties ?? [],
            baseZip: row.service_base_zip ?? undefined,
            radiusMiles: row.service_radius_miles ?? undefined,
            baseCoordinates:
              typeof row.service_base_latitude === "number" && typeof row.service_base_longitude === "number"
                ? { latitude: row.service_base_latitude, longitude: row.service_base_longitude }
                : undefined
          }
        : undefined,
    services: row.services,
    allMakes: row.all_makes,
    makesServiced: row.makes_serviced ?? undefined,
    specialtyMakes: row.specialty_makes ?? undefined,
    contact: {
      phone: row.phone,
      email: row.email,
      website: row.website ?? undefined
    },
    description: row.description,
    trust: {
      claimedProfile: row.claimed_profile,
      verified: row.verified,
      verifiedAt: row.verified_at ?? undefined
    }
  };
}

export class InMemoryProviderPersistence implements ProviderPersistence {
  private records: ProviderSubmissionRecord[];

  constructor(initialRecords: ProviderSubmissionRecord[] = []) {
    this.records = [...initialRecords];
  }

  async createProviderSubmission(record: ProviderSubmissionRecord): Promise<ProviderSubmissionRecord> {
    this.records = [record, ...this.records.filter((existing) => existing.id !== record.id)];
    return record;
  }

  async listProviderSubmissionsForAdmin(_admin: ProviderAdminIdentity): Promise<ProviderSubmissionRecord[]> {
    return [...this.records];
  }

  async getProviderSubmissionForAdmin(id: string, _admin: ProviderAdminIdentity): Promise<ProviderSubmissionRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async transitionProviderStatus(
    id: string,
    status: ProviderStatus,
    admin: ProviderAdminIdentity
  ): Promise<ProviderSubmissionRecord> {
    const current = await this.getProviderSubmissionForAdmin(id, admin);
    if (!current) {
      throw new ProviderPersistenceError("Provider submission was not found.");
    }

    if (!canTransitionProviderStatus(current.status, status)) {
      throw new ProviderPersistenceError("Provider status transition is not allowed.");
    }

    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    this.records = [updated, ...this.records.filter((existing) => existing.id !== id)];
    return updated;
  }

  async listActivePublicProviders(): Promise<Provider[]> {
    return this.records.map(convertSubmissionToProvider).filter((provider): provider is Provider => Boolean(provider));
  }

  async getActivePublicProviderById(id: string): Promise<Provider | null> {
    const providers = await this.listActivePublicProviders();
    return providers.find((provider) => provider.id === id) ?? null;
  }
}
