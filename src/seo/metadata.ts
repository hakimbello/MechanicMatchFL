import type { Metadata } from "next";

import type { Provider } from "../domain/providers.ts";
import { formatProviderType, formatSpecialty } from "../presentation/providerText.ts";
import { buildAbsoluteUrl, buildCanonicalPath, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "./site.ts";

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

export const homeMetadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalPath("/")
  },
  openGraph: {
    title: `${HOME_TITLE} | ${SITE_NAME}`,
    description: HOME_DESCRIPTION,
    url: buildAbsoluteUrl("/")
  },
  twitter: {
    title: `${HOME_TITLE} | ${SITE_NAME}`,
    description: HOME_DESCRIPTION
  }
};

export const listBusinessMetadata: Metadata = {
  title: LIST_BUSINESS_TITLE,
  description: LIST_BUSINESS_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalPath("/list-your-business")
  },
  openGraph: {
    title: `${LIST_BUSINESS_TITLE} | ${SITE_NAME}`,
    description: LIST_BUSINESS_DESCRIPTION,
    url: buildAbsoluteUrl("/list-your-business")
  },
  twitter: {
    title: `${LIST_BUSINESS_TITLE} | ${SITE_NAME}`,
    description: LIST_BUSINESS_DESCRIPTION
  }
};

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

export function buildMechanicProfileMetadata(provider: Provider): Metadata {
  const canonicalPath = getMechanicProfileCanonicalPath(provider.id);
  const description = buildMechanicProfileDescription(provider);

  return {
    title: provider.name,
    description,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      type: "profile",
      title: `${provider.name} | ${SITE_NAME}`,
      description,
      url: buildAbsoluteUrl(canonicalPath)
    },
    twitter: {
      title: `${provider.name} | ${SITE_NAME}`,
      description
    }
  };
}

export function buildMechanicProfileNotFoundMetadata(): Metadata {
  return {
    title: "Mechanic profile not found",
    robots: {
      index: false,
      follow: false
    }
  };
}

export function getMechanicProfileCanonicalPath(providerId: string): string {
  return buildCanonicalPath(`/mechanics/${encodeURIComponent(providerId)}`);
}

export function buildMechanicProfileDescription(provider: Provider): string {
  if (provider.description) {
    return provider.description;
  }

  const providerType = formatProviderType(provider.type).toLowerCase();
  const location = getProviderLocationPhrase(provider);
  const services = provider.services.slice(0, 3).map(formatSpecialty).join(", ");

  return [provider.name, providerType, location, services ? `Services include ${services}.` : undefined]
    .filter(Boolean)
    .join(" ");
}

function getProviderLocationPhrase(provider: Provider): string {
  if (provider.locationKind === "mobile") {
    const zips = provider.mobileServiceArea?.zipCodes;
    const counties = provider.mobileServiceArea?.counties;

    if (zips?.length) {
      return `serving ZIP codes ${zips.join(", ")}.`;
    }

    if (counties?.length) {
      return `serving ${counties.join(", ")}.`;
    }

    return "serving a defined South Florida mobile service area.";
  }

  return [provider.address?.city, provider.address?.county].filter(Boolean).join(", ");
}
