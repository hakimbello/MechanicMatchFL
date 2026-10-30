import type { Metadata } from "next";

import type { Provider } from "../domain/providers.ts";
import { formatProviderType, formatSpecialty } from "../presentation/providerText.ts";
import { buildAbsoluteUrl, buildCanonicalPath, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "./site.ts";
import { localeAlternates, localizePublicPath, type PublicLocale } from "../i18n/locale.ts";
import { getPublicMessages } from "../i18n/messages.ts";

export const HOME_TITLE = "Find the right mechanic for your car";
export const HOME_DESCRIPTION =
  "Find local independent shops, mobile mechanics, and repair specialists in Miami-Dade and Broward matched to your vehicle, repair need, and ZIP code.";

export const LIST_BUSINESS_TITLE = "List your mechanic business";
export const LIST_BUSINESS_DESCRIPTION =
  "Submit a South Florida mechanic or automotive repair provider listing for review on MechanicMatchFL.";

export function buildRootMetadata(): Metadata {
  return {
    metadataBase: getSiteUrl(),
    title: {
      default: `${SITE_NAME} | ${HOME_TITLE}`,
      template: `%s | ${SITE_NAME}`
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} | ${HOME_TITLE}`,
      description: SITE_DESCRIPTION,
      url: buildAbsoluteUrl("/")
    },
    twitter: {
      card: "summary",
      title: `${SITE_NAME} | ${HOME_TITLE}`,
      description: SITE_DESCRIPTION
    }
  };
}

export function buildHomeMetadata(locale: PublicLocale = "en"): Metadata {
  const messages = getPublicMessages(locale).metadata;
  const path = localizePublicPath("/", locale);
  return {
    title: messages.homeTitle,
    description: messages.homeDescription,
    alternates: { ...localeAlternates("/"), canonical: path },
    openGraph: {
      title: `${messages.homeTitle} | ${SITE_NAME}`,
      description: messages.homeDescription,
      locale: locale === "es" ? "es_US" : "en_US",
      url: buildAbsoluteUrl(path)
    },
    twitter: { title: `${messages.homeTitle} | ${SITE_NAME}`, description: messages.homeDescription }
  };
}

export const homeMetadata: Metadata = buildHomeMetadata("en");

export function buildListBusinessMetadata(locale: PublicLocale = "en"): Metadata {
  const messages = getPublicMessages(locale).metadata;
  const path = localizePublicPath("/list-your-business", locale);
  return {
    title: messages.listingTitle,
    description: messages.listingDescription,
    alternates: { ...localeAlternates("/list-your-business"), canonical: path },
    openGraph: { title: `${messages.listingTitle} | ${SITE_NAME}`, description: messages.listingDescription, locale: locale === "es" ? "es_US" : "en_US", url: buildAbsoluteUrl(path) },
    twitter: { title: `${messages.listingTitle} | ${SITE_NAME}`, description: messages.listingDescription }
  };
}

export const listBusinessMetadata: Metadata = buildListBusinessMetadata("en");

export function buildPrivacyMetadata(locale: PublicLocale = "en"): Metadata {
  const messages = getPublicMessages(locale).metadata;
  const path = localizePublicPath("/privacy", locale);
  return {
    title: messages.privacyTitle,
    description: messages.privacyDescription,
    alternates: { ...localeAlternates("/privacy"), canonical: path },
    openGraph: {
      title: `${messages.privacyTitle} | ${SITE_NAME}`,
      description: messages.privacyDescription,
      locale: locale === "es" ? "es_US" : "en_US",
      url: buildAbsoluteUrl(path)
    },
    twitter: { title: `${messages.privacyTitle} | ${SITE_NAME}`, description: messages.privacyDescription }
  };
}

export const adminProvidersMetadata: Metadata = {
  title: "Development provider review",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export function buildMechanicProfileMetadata(provider: Provider, locale: PublicLocale = "en"): Metadata {
  const canonicalPath = getMechanicProfileCanonicalPath(provider.id, locale);
  const description = buildMechanicProfileDescription(provider, locale);
  const basePath = `/mechanics/${encodeURIComponent(provider.id)}`;

  return {
    title: provider.name,
    description,
    alternates: {
      ...localeAlternates(basePath),
      canonical: canonicalPath
    },
    openGraph: {
      type: "profile",
      title: `${provider.name} | ${SITE_NAME}`,
      description,
      locale: locale === "es" ? "es_US" : "en_US",
      url: buildAbsoluteUrl(canonicalPath)
    },
    twitter: {
      title: `${provider.name} | ${SITE_NAME}`,
      description
    }
  };
}

export function buildMechanicProfileNotFoundMetadata(locale: PublicLocale = "en"): Metadata {
  return {
    title: getPublicMessages(locale).metadata.notFound,
    robots: {
      index: false,
      follow: false
    }
  };
}

export function getMechanicProfileCanonicalPath(providerId: string, locale: PublicLocale = "en"): string {
  return buildCanonicalPath(localizePublicPath(`/mechanics/${encodeURIComponent(providerId)}`, locale));
}

export function buildMechanicProfileDescription(provider: Provider, locale: PublicLocale = "en"): string {
  if (provider.description) {
    return provider.description;
  }

  const providerType = formatProviderType(provider.type, locale).toLowerCase();
  const location = getProviderLocationPhrase(provider, locale);
  const services = provider.services.slice(0, 3).map((service) => formatSpecialty(service, locale)).join(", ");

  const serviceText = services ? (locale === "es" ? `Los servicios incluyen ${services}.` : `Services include ${services}.`) : undefined;
  return [provider.name, providerType, location, serviceText]
    .filter(Boolean)
    .join(" ");
}

function getProviderLocationPhrase(provider: Provider, locale: PublicLocale): string {
  if (provider.locationKind === "mobile") {
    const zips = provider.mobileServiceArea?.zipCodes;
    const counties = provider.mobileServiceArea?.counties;

    if (zips?.length) {
      return locale === "es" ? `atiende los códigos postales ${zips.join(", ")}.` : `serving ZIP codes ${zips.join(", ")}.`;
    }

    if (counties?.length) {
      return locale === "es" ? `atiende ${counties.join(", ")}.` : `serving ${counties.join(", ")}.`;
    }

    return locale === "es" ? "atiende un área móvil definida del sur de Florida." : "serving a defined South Florida mobile service area.";
  }

  return [provider.address?.city, provider.address?.county].filter(Boolean).join(", ");
}
