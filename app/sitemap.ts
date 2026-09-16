import type { MetadataRoute } from "next";

import { buildPublicSitemapEntries } from "../src/seo/sitemap.ts";
import { listRuntimePublicProviders } from "../src/providers/runtimeProviderPersistence.ts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const providers = await listRuntimePublicProviders();
  return buildPublicSitemapEntries(providers);
}
