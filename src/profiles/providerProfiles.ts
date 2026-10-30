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
import { formatMessage, getPublicMessages } from "../i18n/messages.ts";
import type { PublicLocale } from "../i18n/locale.ts";

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
  experienceLine?: string;
  languagesLine?: string;
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
  context?: { serviceCategory?: CustomerServiceCategory; make?: string; zip?: string },
  locale: PublicLocale = "en"
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
  const prefix = locale === "es" ? "/es" : "";
  return `${prefix}/mechanics/${encodeURIComponent(providerId)}${query ? `?${query}` : ""}`;
}

export function buildProviderProfileView(provider: Provider, context?: ProfileSearchContextInput, locale: PublicLocale = "en"): ProviderProfileView {
  const messages = getPublicMessages(locale).presentation;
  const matchContext = buildProfileMatchContext(provider, context, locale);

  return {
    id: provider.id,
    name: provider.name,
    providerType: formatProviderType(provider.type, locale),
    locationKind: formatLocationKind(provider.locationKind, locale),
    locationLine: buildLocationLine(provider, locale),
    serviceAreaLine: buildServiceAreaLine(provider, locale),
    services: provider.services.map((service) => formatSpecialty(service, locale)),
    makesLine: provider.allMakes ? messages.allMakes : formatMessage(messages.worksOnMake, { make: provider.makesServiced?.join(", ") ?? messages.selectedMakes }),
    specialtyMakesLine: provider.specialtyMakes?.length ? formatMessage(messages.specializes, { makes: provider.specialtyMakes.join(", ") }) : undefined,
    experienceLine:
      typeof provider.yearsExperience === "number"
        ? formatMessage(messages.providerReportedYears, { years: provider.yearsExperience, unit: provider.yearsExperience === 1 ? messages.year : messages.years })
        : undefined,
    languagesLine: provider.spokenLanguages?.length
      ? formatMessage(messages.providerReportedLanguages, { languages: provider.spokenLanguages.join(", ") })
      : undefined,
    description: provider.description,
    verified: Boolean(provider.trust?.verified),
    claimedProfile: Boolean(provider.trust?.claimedProfile),
    contactActions: buildContactActions(provider, locale),
    matchContext
  };
}

export function buildProfileMatchContext(
  provider: Provider,
  context?: ProfileSearchContextInput,
  locale: PublicLocale = "en"
): ProfileMatchContext | undefined {
  const messages = getPublicMessages(locale).presentation;
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
      serviceLine: formatServiceCategory(context.serviceCategory, locale),
      vehicleLine: context.make,
      serviceCategory: context.serviceCategory
    };
  }

  return {
    serviceLine: formatServiceCategory(context.serviceCategory, locale),
    vehicleLine: context.make,
    locationLine:
      provider.locationKind === "mobile"
        ? messages.servesArea
        : typeof match.distanceMiles === "number"
          ? formatMessage(messages.milesAway, { distance: formatDistance(match.distanceMiles, locale) })
          : provider.address?.zip === context.zip
            ? messages.nearbyShop
            : undefined,
    serviceCategory: context.serviceCategory
  };
}

function buildLocationLine(provider: Provider, locale: PublicLocale): string {
  if (provider.locationKind === "mobile") {
    return getPublicMessages(locale).presentation.mobileZips;
  }

  return [provider.address?.city, provider.address?.county, provider.address?.zip].filter(Boolean).join(", ");
}

function buildServiceAreaLine(provider: Provider, locale: PublicLocale): string | undefined {
  if (provider.locationKind !== "mobile") {
    return undefined;
  }

  const zipCodes = provider.mobileServiceArea?.zipCodes;
  const baseZip = provider.mobileServiceArea?.baseZip;
  const radiusMiles = provider.mobileServiceArea?.radiusMiles;
  const messages = getPublicMessages(locale).presentation;
  const parts: string[] = [];
  if (zipCodes?.length) {
    parts.push(formatMessage(messages.zipCodes, { zips: zipCodes.join(", ") }));
  }
  if (baseZip && radiusMiles) {
    parts.push(formatMessage(messages.radius, { radius: radiusMiles, zip: baseZip }));
  }
  return parts.length ? formatMessage(messages.serves, { area: parts.join("; ") }) : messages.unavailableArea;
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
