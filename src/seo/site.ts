export const SITE_NAME = "MechanicMatchFL";
export const PRODUCTION_SITE_URL = "https://MechanicMatchFL.com";
export const SITE_DESCRIPTION =
  "MechanicMatchFL helps South Florida drivers find the right local mechanic for their vehicle, repair need, and location.";

type SiteUrlEnvironment = Record<string, string | undefined>;

export function getSiteUrl(env: SiteUrlEnvironment = process.env): URL {
  const configuredUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    return normalizeSiteUrl(configuredUrl);
  }

  const vercelUrl = env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeSiteUrl(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);
  }

  return normalizeSiteUrl(PRODUCTION_SITE_URL);
}

export function buildAbsoluteUrl(pathname: string, env?: SiteUrlEnvironment): string {
  return new URL(normalizePathname(pathname), getSiteUrl(env)).toString();
}

export function buildCanonicalPath(pathname: string): string {
  return normalizePathname(pathname.split("?")[0] ?? "/");
}

function normalizeSiteUrl(value: string): URL {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
