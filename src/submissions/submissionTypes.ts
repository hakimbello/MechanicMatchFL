import type {
  LaunchCounty,
  LocationKind,
  ProviderSpecialty,
  ProviderStatus,
  ProviderType
} from "../domain/providers.ts";

export const AUTHORIZATION_RELATIONSHIPS = [
  "myself",
  "my-business",
  "family-member",
  "i-work-for-this-business"
] as const;

export type AuthorizationRelationship = (typeof AUTHORIZATION_RELATIONSHIPS)[number];

export interface ProviderSubmissionInput {
  businessName: string;
  phone: string;
  email: string;
  providerType: ProviderType | "";
  locationKind: LocationKind | "";
  street: string;
  city: string;
  county: LaunchCounty | "";
  zip: string;
  serviceZipCodes: string;
  serviceCounties: LaunchCounty[];
  serviceBaseZip: string;
  serviceRadiusMiles: string;
  services: ProviderSpecialty[];
  allMakes: boolean;
  makesServiced: string;
  specialtyMakes: string;
  yearsExperience: string;
  spokenLanguages: string[];
  otherLanguage: string;
  description: string;
  profileImageRef: string;
  registrationNumber: string;
  authorizationRelationship: AuthorizationRelationship | "";
  authorizationAttested: boolean;
}

export type SubmissionFieldErrors = Partial<Record<keyof ProviderSubmissionInput, string>>;

export interface SubmittedRegistration {
  value: string;
  verificationStatus: "submitted-unverified";
}

export interface ProviderSubmissionRecord {
  id: string;
  status: ProviderStatus;
  submittedAt: string;
  updatedAt: string;
  businessName: string;
  phone: string;
  email: string;
  providerType: ProviderType;
  locationKind: LocationKind;
  street?: string;
  city?: string;
  county?: LaunchCounty;
  zip?: string;
  serviceZipCodes?: string[];
  serviceCounties?: LaunchCounty[];
  serviceBaseZip?: string;
  serviceRadiusMiles?: number;
  services: ProviderSpecialty[];
  allMakes: boolean;
  makesServiced?: string[];
  specialtyMakes?: string[];
  yearsExperience?: number;
  spokenLanguages?: string[];
  description: string;
  profileImageRef?: string;
  registration?: SubmittedRegistration;
  authorizationRelationship: AuthorizationRelationship;
  authorizationAttested: boolean;
}

export const EMPTY_PROVIDER_SUBMISSION: ProviderSubmissionInput = {
  businessName: "",
  phone: "",
  email: "",
  providerType: "",
  locationKind: "",
  street: "",
  city: "",
  county: "",
  zip: "",
  serviceZipCodes: "",
  serviceCounties: [],
  serviceBaseZip: "",
  serviceRadiusMiles: "",
  services: [],
  allMakes: true,
  makesServiced: "",
  specialtyMakes: "",
  yearsExperience: "",
  spokenLanguages: [],
  otherLanguage: "",
  description: "",
  profileImageRef: "",
  registrationNumber: "",
  authorizationRelationship: "",
  authorizationAttested: false
};
