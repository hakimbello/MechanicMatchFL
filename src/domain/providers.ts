export const LAUNCH_COUNTIES = ["Miami-Dade", "Broward"] as const;

export type LaunchCounty = (typeof LAUNCH_COUNTIES)[number];

export const PROVIDER_TYPES = [
  "independent-auto-repair-shop",
  "mobile-mechanic",
  "tire-service-shop",
  "repair-specialist"
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_STATUSES = [
  "draft",
  "submitted",
  "under-review",
  "approved",
  "active",
  "changes-requested",
  "rejected",
  "deactivated"
] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const CUSTOMER_SERVICE_CATEGORIES = [
  "wont-start",
  "brakes",
  "ac",
  "tires",
  "engine",
  "transmission",
  "electrical",
  "suspension",
  "maintenance",
  "check-engine-light",
  "other-not-sure"
] as const;

export type CustomerServiceCategory = (typeof CUSTOMER_SERVICE_CATEGORIES)[number];

export const PROVIDER_SPECIALTIES = [
  "general-repair",
  "engine",
  "transmission",
  "brakes",
  "tires-wheels",
  "ac",
  "electrical-diagnostics",
  "suspension",
  "maintenance",
  "check-engine-diagnostics",
  "diesel",
  "exhaust",
  "cooling-radiator",
  "alignment"
] as const;

export type ProviderSpecialty = (typeof PROVIDER_SPECIALTIES)[number];

export type LocationKind = "physical" | "mobile";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PhysicalAddress {
  street: string;
  city: string;
  county: LaunchCounty;
  zip: string;
  coordinates?: Coordinates;
}

export interface MobileServiceArea {
  zipCodes?: string[];
  counties?: LaunchCounty[];
  baseZip?: string;
  radiusMiles?: number;
  baseCoordinates?: Coordinates;
}

export interface ProviderTrustSignals {
  claimedProfile?: boolean;
  verified?: boolean;
  verifiedAt?: string;
}

export interface ProviderContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  locationKind: LocationKind;
  address?: PhysicalAddress;
  mobileServiceArea?: MobileServiceArea;
  services: ProviderSpecialty[];
  allMakes: boolean;
  makesServiced?: string[];
  specialtyMakes?: string[];
  contact?: ProviderContact;
  description?: string;
  profileImageRef?: string;
  trust?: ProviderTrustSignals;
}

export interface VehicleInput {
  year?: number;
  make: string;
  model?: string;
}

export interface MatchRequest {
  serviceCategory: CustomerServiceCategory;
  vehicle: VehicleInput;
  zip: string;
  coordinates?: Coordinates;
}
