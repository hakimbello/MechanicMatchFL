import type { CustomerServiceCategory } from "../domain/providers.ts";
import type { ContactMethod } from "../profiles/contact.ts";

export interface MechanicContactEventInput {
  providerId: string;
  contactMethod: ContactMethod;
  sourcePage: "profile";
  serviceCategory?: CustomerServiceCategory;
}

export interface MechanicContactEvent {
  name: "mechanic_contact_clicked";
  properties: {
    provider_id: string;
    contact_method: ContactMethod;
    source_page: "profile";
    service_category?: CustomerServiceCategory;
  };
}

export type ContactEventSink = (event: MechanicContactEvent) => void;

export function buildMechanicContactEvent(input: MechanicContactEventInput): MechanicContactEvent {
  return {
    name: "mechanic_contact_clicked",
    properties: {
      provider_id: input.providerId,
      contact_method: input.contactMethod,
      source_page: input.sourcePage,
      ...(input.serviceCategory ? { service_category: input.serviceCategory } : {})
    }
  };
}

export function recordMechanicContactClick(input: MechanicContactEventInput, sink: ContactEventSink = () => undefined) {
  sink(buildMechanicContactEvent(input));
}
