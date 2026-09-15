import type { CustomerServiceCategory, Provider, ProviderSpecialty } from "../domain/providers.ts";

export const PROVIDER_TYPE_LABELS: Record<Provider["type"], string> = {
  "independent-auto-repair-shop": "Independent repair shop",
  "mobile-mechanic": "Mobile mechanic",
  "tire-service-shop": "Tire/service shop",
  "repair-specialist": "Repair specialist"
};

export const LOCATION_KIND_LABELS: Record<Provider["locationKind"], string> = {
  physical: "Physical shop",
  mobile: "Mobile mechanic"
};

export const SERVICE_CATEGORY_LABELS: Record<CustomerServiceCategory, string> = {
  "wont-start": "Won't Start",
  brakes: "Brakes",
  ac: "AC",
  tires: "Tires",
  engine: "Engine",
  transmission: "Transmission",
  electrical: "Electrical",
  suspension: "Suspension",
  maintenance: "Maintenance",
  "check-engine-light": "Check Engine Light",
  "other-not-sure": "Other / Not Sure"
};

export const SPECIALTY_LABELS: Record<ProviderSpecialty, string> = {
  "general-repair": "General repair",
  engine: "Engine service",
  transmission: "Transmission specialist",
  brakes: "Brake service",
  "tires-wheels": "Tires and wheels",
  ac: "AC specialist",
  "electrical-diagnostics": "Electrical diagnostics",
  suspension: "Suspension service",
  maintenance: "Maintenance",
  "check-engine-diagnostics": "Check-engine diagnostics",
  diesel: "Diesel service",
  exhaust: "Exhaust service",
  "cooling-radiator": "Cooling and radiator",
  alignment: "Alignment"
};

export function formatProviderType(type: Provider["type"]): string {
  return PROVIDER_TYPE_LABELS[type];
}

export function formatLocationKind(kind: Provider["locationKind"]): string {
  return LOCATION_KIND_LABELS[kind];
}

export function formatServiceCategory(category: CustomerServiceCategory): string {
  return SERVICE_CATEGORY_LABELS[category];
}

export function formatSpecialty(specialty: ProviderSpecialty): string {
  return SPECIALTY_LABELS[specialty];
}
