import { matchProviders, type ProviderMatch } from "../domain/matching.ts";
import {
  CUSTOMER_SERVICE_CATEGORIES,
  type CustomerServiceCategory,
  type MatchRequest,
  type Provider,
  type ProviderSpecialty
} from "../domain/providers.ts";
import { hasLaunchZipCoordinates, isLaunchZip } from "../geography/launchGeography.ts";
import { buildProfileHref } from "../profiles/providerProfiles.ts";
import { SERVICE_CATEGORY_LABELS, formatProviderType, formatServiceCategory, formatSpecialty } from "../presentation/providerText.ts";
import { getDefaultProviderData } from "../providers/providerSource.ts";
import { formatMessage, getPublicMessages } from "../i18n/messages.ts";
import type { PublicLocale } from "../i18n/locale.ts";

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

export function getServiceOptions(locale: PublicLocale = "en"): { value: CustomerServiceCategory; label: string }[] {
  return CUSTOMER_SERVICE_CATEGORIES.map((value) => ({ value, label: formatServiceCategory(value, locale) }));
}

export const VEHICLE_MAKE_OPTIONS = ["Chevrolet", "Ford", "Honda", "Hyundai", "Kia", "Nissan", "Toyota"];

export const VEHICLE_YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => String(new Date().getFullYear() + 1 - index));

export function runProviderSearch(
  input: SearchFormInput,
  providers: Provider[] = getDefaultProviderData(),
  locale: PublicLocale = "en"
): { ok: true; request: MatchRequest; results: SearchResultView[] } | { ok: false; errors: SearchFieldErrors } {
  const validation = buildSearchRequest(input, locale);
  if (!validation.ok) {
    return validation;
  }

  const matches = matchProviders(validation.request, providers);

  return {
    ok: true,
    request: validation.request,
    results: matches.map((match) => presentProviderMatch(match, validation.request, locale))
  };
}

export function buildSearchRequest(
  input: SearchFormInput,
  locale: PublicLocale = "en"
): { ok: true; request: MatchRequest } | { ok: false; errors: SearchFieldErrors } {
  const errors = validateSearchInput(input, locale);
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

export function validateSearchInput(input: SearchFormInput, locale: PublicLocale = "en"): SearchFieldErrors {
  const errors: SearchFieldErrors = {};
  const messages = getPublicMessages(locale).validation;
  const year = Number(input.year);
  const currentYear = new Date().getFullYear() + 1;

  if (!input.year.trim()) {
    errors.year = messages.searchYearRequired;
  } else if (!Number.isInteger(year) || year < 1980 || year > currentYear) {
    errors.year = messages.searchYearInvalid;
  }

  if (!input.make.trim()) {
    errors.make = messages.searchMake;
  }

  if (!input.model.trim()) {
    errors.model = messages.searchModel;
  }

  if (!isCustomerServiceCategory(input.serviceCategory)) {
    errors.serviceCategory = messages.searchService;
  }

  if (!/^\d{5}$/.test(input.zip.trim())) {
    errors.zip = messages.searchZip;
  } else if (!isLaunchZip(input.zip)) {
    errors.zip = messages.searchLaunchZip;
  } else if (!hasLaunchZipCoordinates(input.zip)) {
    errors.zip = messages.searchCoordinates;
  }

  return errors;
}

export function presentProviderMatch(match: ProviderMatch, request: MatchRequest, locale: PublicLocale = "en"): SearchResultView {
  const { provider } = match;
  const messages = getPublicMessages(locale).presentation;
  const locationLine =
    provider.locationKind === "mobile"
      ? messages.servesArea
      : [provider.address?.city, provider.address?.county].filter(Boolean).join(", ");

  return {
    id: provider.id,
    name: provider.name,
    providerType: formatProviderType(provider.type, locale),
    locationLine,
    description: provider.description,
    verified: Boolean(provider.trust?.verified),
    reasons: deriveCustomerReasons(match, request, locale),
    profileHref: buildProfileHref(provider.id, {
      serviceCategory: request.serviceCategory,
      make: request.vehicle.make,
      zip: request.zip
    }, locale)
  };
}

export function deriveCustomerReasons(match: ProviderMatch, request: MatchRequest, locale: PublicLocale = "en"): string[] {
  const reasons = new Set<string>();
  const messages = getPublicMessages(locale).presentation;

  for (const reason of match.reasons) {
    if (reason.startsWith("service:")) {
      const service = reason.replace("service:", "") as ProviderSpecialty;
      reasons.add(formatSpecialty(service, locale));
    }

    if (reason === "vehicle:all-makes") {
      reasons.add(messages.allMakes);
    }

    if (reason.startsWith("vehicle:make:") || reason.startsWith("vehicle:specialty-make:")) {
      reasons.add(formatMessage(messages.searchWorksOnMake, { make: request.vehicle.make }));
    }

    if (reason.startsWith("geography:mobile")) {
      reasons.add(messages.servesArea);
    }

    if (reason === "geography:shop-same-zip") {
      reasons.add(messages.nearbyShop);
    }

    if (reason === "geography:shop-distance" && typeof match.distanceMiles === "number") {
      reasons.add(formatMessage(messages.milesAway, { distance: formatDistance(match.distanceMiles, locale) }));
    }
  }

  if (match.provider.trust?.verified) {
    reasons.add(getPublicMessages(locale).profile.verified);
  }

  return Array.from(reasons).filter(Boolean).slice(0, 4);
}

function isCustomerServiceCategory(value: string): value is CustomerServiceCategory {
  return CUSTOMER_SERVICE_CATEGORIES.includes(value as CustomerServiceCategory);
}

function formatDistance(distanceMiles: number, locale: PublicLocale): string {
  if (distanceMiles < 1) {
    return getPublicMessages(locale).presentation.lessThanOne;
  }

  return distanceMiles.toFixed(1);
}
