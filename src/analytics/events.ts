import type { CustomerServiceCategory, LocationKind, ProviderType } from "../domain/providers.ts";
import type { ContactMethod } from "../profiles/contact.ts";

export type AnalyticsEventName =
  | "mechanic_search_submitted"
  | "mechanic_search_results_viewed"
  | "mechanic_profile_viewed"
  | "mechanic_contact_clicked"
  | "provider_submission_started"
  | "provider_submission_completed";

export type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties: AnalyticsEventProperties;
}

export interface MechanicSearchSubmittedInput {
  serviceCategory: CustomerServiceCategory;
  vehicleMake: string;
  zip?: string;
}

export interface MechanicSearchResultsViewedInput {
  serviceCategory: CustomerServiceCategory;
  resultCount: number;
}

export interface MechanicProfileViewedInput {
  providerId: string;
  providerType: ProviderType;
  serviceCategory?: CustomerServiceCategory;
}

export interface MechanicContactEventInput {
  providerId: string;
  contactMethod: ContactMethod;
  sourcePage: "profile";
  serviceCategory?: CustomerServiceCategory;
}

export interface ProviderSubmissionCompletedInput {
  providerType: ProviderType;
  locationKind: LocationKind;
}

export function buildMechanicSearchSubmittedEvent(input: MechanicSearchSubmittedInput): AnalyticsEvent {
  return {
    name: "mechanic_search_submitted",
    properties: compactProperties({
      service_category: input.serviceCategory,
      vehicle_make: input.vehicleMake.trim(),
      launch_area: classifyLaunchArea(input.zip)
    })
  };
}

export function buildMechanicSearchResultsViewedEvent(input: MechanicSearchResultsViewedInput): AnalyticsEvent {
  return {
    name: "mechanic_search_results_viewed",
    properties: {
      service_category: input.serviceCategory,
      result_count: input.resultCount
    }
  };
}

export function buildMechanicProfileViewedEvent(input: MechanicProfileViewedInput): AnalyticsEvent {
  return {
    name: "mechanic_profile_viewed",
    properties: compactProperties({
      provider_id: input.providerId,
      provider_type: input.providerType,
      service_category: input.serviceCategory
    })
  };
}

export function buildMechanicContactEvent(input: MechanicContactEventInput): AnalyticsEvent {
  return {
    name: "mechanic_contact_clicked",
    properties: compactProperties({
      provider_id: input.providerId,
      contact_method: input.contactMethod,
      source_page: input.sourcePage,
      service_category: input.serviceCategory
    })
  };
}

export function buildProviderSubmissionStartedEvent(): AnalyticsEvent {
  return {
    name: "provider_submission_started",
    properties: {}
  };
}

export function buildProviderSubmissionCompletedEvent(input: ProviderSubmissionCompletedInput): AnalyticsEvent {
  return {
    name: "provider_submission_completed",
    properties: {
      provider_type: input.providerType,
      location_kind: input.locationKind
    }
  };
}

export function classifyLaunchArea(zip?: string): "Miami-Dade" | "Broward" | undefined {
  if (!zip) {
    return undefined;
  }

  if (["33130", "33139", "33155", "33161"].includes(zip)) {
    return "Miami-Dade";
  }

  if (["33020", "33301", "33311", "33316"].includes(zip)) {
    return "Broward";
  }

  return undefined;
}

function compactProperties(properties: AnalyticsEventProperties): AnalyticsEventProperties {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}
