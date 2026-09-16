import { matchProviders, type ProviderMatch } from "../domain/matching.ts";
import {
  CUSTOMER_SERVICE_CATEGORIES,
  type CustomerServiceCategory,
  type MatchRequest,
  type Provider
} from "../domain/providers.ts";
import { isLaunchZip } from "../geography/launchGeography.ts";
import { buildProfileHref } from "../profiles/providerProfiles.ts";
import { SERVICE_CATEGORY_LABELS, SPECIALTY_LABELS, PROVIDER_TYPE_LABELS } from "../presentation/providerText.ts";
import { getDefaultProviderData } from "../providers/providerSource.ts";

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
  profileHref: string;
}

export const EMPTY_SEARCH_FORM: SearchFormInput = {
  year: "",
  make: "",
  model: "",
  serviceCategory: "",
  zip: ""
};

export const SERVICE_OPTIONS: { value: CustomerServiceCategory; label: string }[] = [
  { value: "wont-start", label: SERVICE_CATEGORY_LABELS["wont-start"] },
  { value: "brakes", label: SERVICE_CATEGORY_LABELS.brakes },
  { value: "ac", label: SERVICE_CATEGORY_LABELS.ac },
  { value: "tires", label: SERVICE_CATEGORY_LABELS.tires },
  { value: "engine", label: SERVICE_CATEGORY_LABELS.engine },
  { value: "transmission", label: SERVICE_CATEGORY_LABELS.transmission },
  { value: "electrical", label: SERVICE_CATEGORY_LABELS.electrical },
  { value: "suspension", label: SERVICE_CATEGORY_LABELS.suspension },
  { value: "maintenance", label: SERVICE_CATEGORY_LABELS.maintenance },
  { value: "check-engine-light", label: SERVICE_CATEGORY_LABELS["check-engine-light"] },
  { value: "other-not-sure", label: SERVICE_CATEGORY_LABELS["other-not-sure"] }
];

export const VEHICLE_MAKE_OPTIONS = ["Chevrolet", "Ford", "Honda", "Hyundai", "Kia", "Nissan", "Toyota"];

export const VEHICLE_YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => String(new Date().getFullYear() + 1 - index));

export function runProviderSearch(
  input: SearchFormInput,
  providers: Provider[] = getDefaultProviderData()
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
  } else if (!isLaunchZip(input.zip)) {
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
    reasons: deriveCustomerReasons(match, request),
    profileHref: buildProfileHref(provider.id, {
      serviceCategory: request.serviceCategory,
      make: request.vehicle.make,
      zip: request.zip
    })
  };
}

export function deriveCustomerReasons(match: ProviderMatch, request: MatchRequest): string[] {
  const reasons = new Set<string>();

  for (const reason of match.reasons) {
    if (reason.startsWith("service:")) {
      const service = reason.replace("service:", "") as keyof typeof SPECIALTY_LABELS;
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
