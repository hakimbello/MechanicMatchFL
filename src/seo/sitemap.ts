import type { Provider } from "../domain/providers.ts";
import { getPublicProviderIds } from "../profiles/providerProfiles.ts";
import { getDefaultProviderData } from "../providers/providerSource.ts";
import { isPublicProvider } from "../submissions/publication.ts";
import { buildAbsoluteUrl } from "./site.ts";

export interface PublicSitemapEntry {
  url: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  alternates?: { languages: Record<string, string> };
}

export function buildPublicSitemapEntries(providers: Provider[] = getDefaultProviderData()): PublicSitemapEntry[] {
  return [
    ...localizedEntries("/", "weekly", 1),
    ...localizedEntries("/list-your-business", "monthly", 0.5),
    ...localizedEntries("/privacy", "monthly", 0.3),
    ...getPublicProviderIds(providers).flatMap((providerId) => localizedEntries(`/mechanics/${encodeURIComponent(providerId)}`, "monthly", 0.7))
  ];
}

function localizedEntries(path: string, changeFrequency: "weekly" | "monthly", priority: number): PublicSitemapEntry[] {
  const english = buildAbsoluteUrl(path);
  const spanish = buildAbsoluteUrl(path === "/" ? "/es" : `/es${path}`);
  const alternates = { languages: { "en-US": english, "es-US": spanish, "x-default": english } };
  return [
    { url: english, changeFrequency, priority, alternates },
    { url: spanish, changeFrequency, priority, alternates }
  ];
}

export function isSitemapProviderEligible(provider: Pick<Provider, "status">): boolean {
  return isPublicProvider(provider);
}
