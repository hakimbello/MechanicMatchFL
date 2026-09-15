import { matchProviders, type ProviderMatch } from "../domain/matching.ts";
import {
  CUSTOMER_SERVICE_CATEGORIES,
  type CustomerServiceCategory,
  type MatchRequest,
  type Provider,
  type ProviderSpecialty
} from "../domain/providers.ts";
import { DEVELOPMENT_PROVIDERS } from "../fixtures/developmentProviders.ts";

export interface SearchFormInput {
  year: string;
  make: string;
  model: string;
  serviceCategory: string;
  zip: string;
}

export type SearchFieldErrors = Partial<Record<keyof SearchFormInput, string>>;

export interface SearchResultView {
  id: string;
  name: string;
  providerType: string;
  locationLine: string;
  description?: string;
  verified: boolean;
  reasons: string[];
}

export const EMPTY_SEARCH_FORM: SearchFormInput = {
  year: "",
  make: "",
  model: "",
  serviceCategory: "",
  zip: ""
};

export const SERVICE_OPTIONS: { value: CustomerServiceCategory; label: string }[] = [
  { value: "wont-start", label: "Won't Start" },
  { value: "brakes", label: "Brakes" },
  { value: "ac", label: "AC" },
  { value: "tires", label: "Tires" },
  { value: "engine", label: "Engine" },
  { value: "transmission", label: "Transmission" },
  { value: "electrical", label: "Electrical" },
  { value: "suspension", label: "Suspension" },
  { value: "maintenance", label: "Maintenance" },
  { value: "check-engine-light", label: "Check Engine Light" },
  { value: "other-not-sure", label: "Other / Not Sure" }
];

export const VEHICLE_MAKE_OPTIONS = ["Chevrolet", "Ford", "Honda", "Hyundai", "Kia", "Nissan", "Toyota"];

export const VEHICLE_YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => String(new Date().getFullYear() + 1 - index));

const LAUNCH_ZIPS = new Set(["33020", "33130", "33139", "33155", "33161", "33301", "33311", "33316"]);

const PROVIDER_TYPE_LABELS: Record<Provider["type"], string> = {
  "independent-auto-repair-shop": "Independent repair shop",
  "mobile-mechanic": "Mobile mechanic",
  "tire-service-shop": "Tire/service shop",
  "repair-specialist": "Repair specialist"
};

const SPECIALTY_LABELS: Record<ProviderSpecialty, string> = {
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

export function runProviderSearch(
  input: SearchFormInput,
  providers: Provider[] = DEVELOPMENT_PROVIDERS
): { ok: true; request: MatchRequest; results: SearchResultView[] } | { ok: false; errors: SearchFieldErrors } {
  const validation = buildSearchRequest(input);
  if (!validation.ok) {
    return validation;
  }

  const matches = matchProviders(validation.request, providers);

  return {
    ok: true,
    request: validation.request,
    results: matches.map((match) => presentProviderMatch(match, validation.request))
  };
}

export function buildSearchRequest(
  input: SearchFormInput
): { ok: true; request: MatchRequest } | { ok: false; errors: SearchFieldErrors } {
  const errors = validateSearchInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    request: {
      serviceCategory: input.serviceCategory as CustomerServiceCategory,
      vehicle: {
        year: Number(input.year),
        make: input.make.trim(),
        model: input.model.trim()
      },
      zip: input.zip.trim()
    }
  };
}

export function validateSearchInput(input: SearchFormInput): SearchFieldErrors {
  const errors: SearchFieldErrors = {};
  const year = Number(input.year);
  const currentYear = new Date().getFullYear() + 1;

  if (!input.year.trim()) {
    errors.year = "Choose your vehicle year.";
  } else if (!Number.isInteger(year) || year < 1980 || year > currentYear) {
    errors.year = "Enter a real vehicle year.";
  }

  if (!input.make.trim()) {
    errors.make = "Enter your vehicle make.";
  }

  if (!input.model.trim()) {
    errors.model = "Enter your vehicle model.";
  }

  if (!isCustomerServiceCategory(input.serviceCategory)) {
    errors.serviceCategory = "Choose the repair or service you need.";
  }

  if (!/^\d{5}$/.test(input.zip.trim())) {
    errors.zip = "Enter a valid 5-digit ZIP code.";
  } else if (!LAUNCH_ZIPS.has(input.zip.trim())) {
    errors.zip = "Enter a Miami-Dade or Broward ZIP code.";
  }

  return errors;
}

export function presentProviderMatch(match: ProviderMatch, request: MatchRequest): SearchResultView {
  const { provider } = match;
  const locationLine =
    provider.locationKind === "mobile"
      ? "Serves your area"
      : [provider.address?.city, provider.address?.county].filter(Boolean).join(", ");

  return {
    id: provider.id,
    name: provider.name,
    providerType: PROVIDER_TYPE_LABELS[provider.type],
    locationLine,
    description: provider.description,
    verified: Boolean(provider.trust?.verified),
    reasons: deriveCustomerReasons(match, request)
  };
}

export function deriveCustomerReasons(match: ProviderMatch, request: MatchRequest): string[] {
  const reasons = new Set<string>();

  for (const reason of match.reasons) {
    if (reason.startsWith("service:")) {
      const service = reason.replace("service:", "") as ProviderSpecialty;
      reasons.add(SPECIALTY_LABELS[service]);
    }

    if (reason === "vehicle:all-makes") {
      reasons.add("Works on all makes");
    }

    if (reason.startsWith("vehicle:make:") || reason.startsWith("vehicle:specialty-make:")) {
      reasons.add(`Works on ${request.vehicle.make} vehicles`);
    }

    if (reason.startsWith("geography:mobile")) {
      reasons.add("Serves your area");
    }

    if (reason === "geography:shop-same-zip") {
      reasons.add("Nearby shop");
    }

    if (reason === "geography:shop-distance" && typeof match.distanceMiles === "number") {
      reasons.add(`${formatDistance(match.distanceMiles)} miles away`);
    }
  }

  if (match.provider.trust?.verified) {
    reasons.add("Verified profile");
  }

  return Array.from(reasons).filter(Boolean).slice(0, 4);
}

function isCustomerServiceCategory(value: string): value is CustomerServiceCategory {
  return CUSTOMER_SERVICE_CATEGORIES.includes(value as CustomerServiceCategory);
}

function formatDistance(distanceMiles: number): string {
  if (distanceMiles < 1) {
    return "Less than 1";
  }

  return distanceMiles.toFixed(1);
}
