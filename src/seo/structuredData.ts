import type { Provider } from "../domain/providers.ts";
import { formatSpecialty } from "../presentation/providerText.ts";
import { buildAbsoluteUrl } from "./site.ts";

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];
type JsonLdObject = { [key: string]: JsonLdValue | undefined };

export function buildProviderStructuredData(provider: Provider): JsonLdObject {
  const profileUrl = buildAbsoluteUrl(`/mechanics/${encodeURIComponent(provider.id)}`);
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${profileUrl}#business`,
    name: provider.name,
    description: provider.description,
    url: profileUrl,
    telephone: provider.contact?.phone,
    makesOffer: provider.services.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: formatSpecialty(service)
      }
    }))
  };

  if (provider.profileImageRef?.startsWith("/")) {
    data.image = buildAbsoluteUrl(provider.profileImageRef);
  }

  if (provider.locationKind === "physical" && provider.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: provider.address.street,
      addressLocality: provider.address.city,
      addressRegion: "FL",
      postalCode: provider.address.zip,
      addressCountry: "US"
    };
    data.areaServed = provider.address.county;
  }

  if (provider.locationKind === "mobile") {
    data.areaServed = buildMobileAreaServed(provider);
  }

  return removeUndefinedJsonLd(data);
}

export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildMobileAreaServed(provider: Provider): JsonLdValue[] | string {
  const zipCodes = provider.mobileServiceArea?.zipCodes;
  if (zipCodes?.length) {
    return zipCodes.map((zip) => ({
      "@type": "AdministrativeArea",
      name: `ZIP ${zip}`
    }));
  }

  const counties = provider.mobileServiceArea?.counties;
  if (counties?.length) {
    return counties.map((county) => ({
      "@type": "AdministrativeArea",
      name: `${county} County`
    }));
  }

  return "South Florida mobile service area";
}

function removeUndefinedJsonLd<T extends JsonLdValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedJsonLd(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedJsonLd(item as JsonLdValue)])
    ) as T;
  }

  return value;
}
