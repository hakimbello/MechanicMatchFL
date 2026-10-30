import { CUSTOMER_SERVICE_CATEGORIES } from "../domain/providers.ts";

export const PUBLIC_LOCALES = ["en", "es"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

const LOCALIZED_PUBLIC_ROOTS = [
  "/",
  "/list-your-business",
  "/privacy",
  "/reviews/verify",
  "/safety/report"
] as const;

const SAFE_QUERY_KEYS = new Set(["service", "make", "zip", "providerId"]);

export function normalizePublicLocale(value: string | null | undefined): PublicLocale {
  return value === "es" ? "es" : "en";
}

export function localeFromPathname(pathname: string): PublicLocale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/es") return "/";
  return pathname.startsWith("/es/") ? pathname.slice(3) || "/" : pathname || "/";
}

export function localizePublicPath(pathname: string, locale: PublicLocale): string {
  const normalized = stripLocalePrefix(pathname);
  return locale === "es" ? (normalized === "/" ? "/es" : `/es${normalized}`) : normalized;
}

export function isLocalizedPublicPath(pathname: string): boolean {
  const normalized = stripLocalePrefix(pathname);
  return LOCALIZED_PUBLIC_ROOTS.includes(normalized as (typeof LOCALIZED_PUBLIC_ROOTS)[number])
    || normalized.startsWith("/mechanics/");
}

export function buildLocaleSwitchHref(
  pathname: string,
  targetLocale: PublicLocale,
  query: URLSearchParams | ReadonlyURLSearchParamsLike = new URLSearchParams()
): string {
  const path = localizePublicPath(pathname, targetLocale);
  const safe = new URLSearchParams();

  for (const [key, value] of query.entries()) {
    if (!SAFE_QUERY_KEYS.has(key)) continue;
    const trimmed = value.trim();
    if (key === "service" && CUSTOMER_SERVICE_CATEGORIES.includes(trimmed as never)) safe.set(key, trimmed);
    if (key === "make" && trimmed.length > 0 && trimmed.length <= 80) safe.set(key, trimmed);
    if (key === "zip" && /^\d{5}$/.test(trimmed)) safe.set(key, trimmed);
    if (key === "providerId" && stripLocalePrefix(pathname) === "/safety/report" && /^[A-Za-z0-9_-]{1,128}$/.test(trimmed)) safe.set(key, trimmed);
  }

  const serialized = safe.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function localeAlternates(pathname: string) {
  const english = localizePublicPath(pathname, "en");
  const spanish = localizePublicPath(pathname, "es");
  return {
    canonical: english,
    languages: {
      "en-US": english,
      "es-US": spanish,
      "x-default": english
    }
  };
}

interface ReadonlyURLSearchParamsLike {
  entries(): IterableIterator<[string, string]>;
}
