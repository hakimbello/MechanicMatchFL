import { matchProviders } from "../domain/matching.ts";
import {
  CUSTOMER_SERVICE_CATEGORIES,
  type CustomerServiceCategory,
  type MatchRequest,
  type Provider
} from "../domain/providers.ts";
import { getDefaultProviderData } from "../providers/providerSource.ts";
import { buildContactActions, type ContactAction } from "./contact.ts";
import {
  formatLocationKind,
  formatProviderType,
  formatServiceCategory,
  formatSpecialty
} from "../presentation/providerText.ts";
import { isPublicProvider } from "../submissions/publication.ts";

export interface ProfileSearchContextInput {
  serviceCategory?: string;
  make?: string;
  zip?: string;
}

export interface ProfileMatchContext {
  serviceLine?: string;
  vehicleLine?: string;
  locationLine?: string;
  serviceCategory?: CustomerServiceCategory;
}

export interface ProviderProfileView {
  id: string;
  name: string;
  providerType: string;
  locationKind: string;
  locationLine: string;
  serviceAreaLine?: string;
  services: string[];
  makesLine: string;
  specialtyMakesLine?: string;
  description?: string;
  verified: boolean;
  claimedProfile: boolean;
  contactActions: ContactAction[];
  matchContext?: ProfileMatchContext;
}

export function getPublicProviderById(id: string, providers: Provider[] = getDefaultProviderData()): Provider | null {
  return providers.find((provider) => provider.id === id && isPublicProvider(provider)) ?? null;
}

export function getPublicProviderIds(providers: Provider[] = getDefaultProviderData()): string[] {
  return providers.filter(isPublicProvider).map((provider) => provider.id);
}

export function buildProfileHref(
  providerId: string,
  context?: { serviceCategory?: CustomerServiceCategory; make?: string; zip?: string }
): string {
  const params = new URLSearchParams();

  if (context?.serviceCategory) {
    params.set("service", context.serviceCategory);
  }

  if (context?.make) {
    params.set("make", context.make);
  }

  if (context?.zip) {
    params.set("zip", context.zip);
  }

  const query = params.toString();
  return `/mechanics/${encodeURIComponent(providerId)}${query ? `?${query}` : ""}`;
}

export function buildProviderProfileView(provider: Provider, context?: ProfileSearchContextInput): ProviderProfileView {
  const matchContext = buildProfileMatchContext(provider, context);

  return {
    id: provider.id,
    name: provider.name,
    providerType: formatProviderType(provider.type),
    locationKind: formatLocationKind(provider.locationKind),
    locationLine: buildLocationLine(provider),
    serviceAreaLine: buildServiceAreaLine(provider),
    services: provider.services.map(formatSpecialty),
    makesLine: provider.allMakes ? "Works on all makes" : `Works on ${provider.makesServiced?.join(", ") ?? "selected makes"}`,
    specialtyMakesLine: provider.specialtyMakes?.length ? `Specializes in ${provider.specialtyMakes.join(", ")}` : undefined,
    description: provider.description,
    verified: Boolean(provider.trust?.verified),
    claimedProfile: Boolean(provider.trust?.claimedProfile),
    contactActions: buildContactActions(provider),
    matchContext
  };
}

export function buildProfileMatchContext(
  provider: Provider,
  context?: ProfileSearchContextInput
): ProfileMatchContext | undefined {
  if (!context?.serviceCategory || !context.make || !context.zip || !isCustomerServiceCategory(context.serviceCategory)) {
    return undefined;
  }

  const request: MatchRequest = {
    serviceCategory: context.serviceCategory,
    vehicle: {
      make: context.make
    },
    zip: context.zip
  };

  const match = matchProviders(request, [provider])[0];
  if (!match) {
    return {
      serviceLine: formatServiceCategory(context.serviceCategory),
      vehicleLine: context.make,
      serviceCategory: context.serviceCategory
    };
  }

  return {
    serviceLine: formatServiceCategory(context.serviceCategory),
    vehicleLine: context.make,
    locationLine:
      provider.locationKind === "mobile"
        ? "Serves your area"
        : typeof match.distanceMiles === "number"
          ? `${formatDistance(match.distanceMiles)} miles away`
          : provider.address?.zip === context.zip
            ? "Nearby shop"
            : undefined,
    serviceCategory: context.serviceCategory
  };
}

function buildLocationLine(provider: Provider): string {
  if (provider.locationKind === "mobile") {
    return "Mobile mechanic serving selected ZIP codes";
  }

  return [provider.address?.city, provider.address?.county, provider.address?.zip].filter(Boolean).join(", ");
}

function buildServiceAreaLine(provider: Provider): string | undefined {
  if (provider.locationKind !== "mobile") {
    return undefined;
  }

  const zipCodes = provider.mobileServiceArea?.zipCodes;
  if (zipCodes?.length) {
    return `Serves ZIP codes ${zipCodes.join(", ")}`;
  }

  const counties = provider.mobileServiceArea?.counties;
  if (counties?.length) {
    return `Serves ${counties.join(", ")}`;
  }

  return "Serves a defined mobile service area";
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
