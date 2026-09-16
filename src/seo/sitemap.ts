import type { Provider } from "../domain/providers.ts";
import { getPublicProviderIds } from "../profiles/providerProfiles.ts";
import { getDefaultProviderData } from "../providers/providerSource.ts";
import { isPublicProvider } from "../submissions/publication.ts";
import { buildAbsoluteUrl } from "./site.ts";

export interface PublicSitemapEntry {
  url: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}

export function buildPublicSitemapEntries(providers: Provider[] = getDefaultProviderData()): PublicSitemapEntry[] {
  return [
    {
      url: buildAbsoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: buildAbsoluteUrl("/list-your-business"),
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: buildAbsoluteUrl("/privacy"),
      changeFrequency: "monthly",
      priority: 0.3
    },
    ...getPublicProviderIds(providers).map((providerId) => ({
      url: buildAbsoluteUrl(`/mechanics/${encodeURIComponent(providerId)}`),
      changeFrequency: "monthly" as const,
      priority: 0.7
    }))
  ];
}

export function isSitemapProviderEligible(provider: Pick<Provider, "status">): boolean {
  return isPublicProvider(provider);
}
