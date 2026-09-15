import type { MetadataRoute } from "next";

import { buildPublicSitemapEntries } from "../src/seo/sitemap.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemapEntries();
}
