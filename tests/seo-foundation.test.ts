import assert from "node:assert/strict";
import test from "node:test";

import { DEVELOPMENT_PROVIDERS } from "../src/fixtures/developmentProviders.ts";
import { getPublicProviderById } from "../src/profiles/providerProfiles.ts";
import { adminProvidersMetadata, buildMechanicProfileMetadata, buildRootMetadata, homeMetadata } from "../src/seo/metadata.ts";
import { ADMIN_DISALLOW_RULES, buildRobotsRules } from "../src/seo/robots.ts";
import { buildAbsoluteUrl, buildCanonicalPath, getSiteUrl } from "../src/seo/site.ts";
import { buildPublicSitemapEntries, isSitemapProviderEligible } from "../src/seo/sitemap.ts";
import { buildProviderStructuredData, serializeJsonLd } from "../src/seo/structuredData.ts";

test("canonical site URL helper prefers explicit configured origin", () => {
  const url = getSiteUrl({
    NEXT_PUBLIC_SITE_URL: "https://example.test/some/path?ignored=true"
  });

  assert.equal(url.toString(), "https://example.test/");
  assert.equal(buildAbsoluteUrl("/mechanics/dev-dade-mobile", { NEXT_PUBLIC_SITE_URL: "https://example.test" }), "https://example.test/mechanics/dev-dade-mobile");
});

test("canonical site URL helper supports Vercel preview origins", () => {
  const url = getSiteUrl({
    VERCEL_URL: "mechanicmatchfl-preview.vercel.app"
  });

  assert.equal(url.toString(), "https://mechanicmatchfl-preview.vercel.app/");
});

test("canonical site URL helper falls back to intended production domain", () => {
  assert.equal(getSiteUrl({}).toString(), "https://mechanicmatchfl.com/");
});

test("homepage metadata foundation has customer-focused title, description, and canonical", () => {
  assert.equal(homeMetadata.title, "Find the right mechanic for your car");
  assert.match(String(homeMetadata.description), /Miami-Dade and Broward/);
  assert.equal(homeMetadata.alternates?.canonical, "/");

  const rootMetadata = buildRootMetadata();
  assert.equal(rootMetadata.metadataBase?.toString(), "https://mechanicmatchfl.com/");
});

test("public provider metadata derives from real provider data", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");
  assert.ok(provider);

  const metadata = buildMechanicProfileMetadata(provider);
  assert.equal(metadata.title, "Bayfront Auto Climate");
  assert.equal(metadata.description, provider.description);
  assert.equal(metadata.alternates?.canonical, "/mechanics/dev-dade-ac-specialist");
});

test("profile canonical excludes search-context query parameters", () => {
  assert.equal(
    buildCanonicalPath("/mechanics/dev-dade-mobile?service=ac&make=Honda&zip=33161"),
    "/mechanics/dev-dade-mobile"
  );
});

test("active provider is sitemap eligible", () => {
  assert.equal(isSitemapProviderEligible({ status: "active" }), true);
});

test("submitted provider is not sitemap eligible", () => {
  assert.equal(isSitemapProviderEligible({ status: "submitted" }), false);
});

test("under-review provider is not sitemap eligible", () => {
  assert.equal(isSitemapProviderEligible({ status: "under-review" }), false);
});

test("rejected provider is not sitemap eligible", () => {
  assert.equal(isSitemapProviderEligible({ status: "rejected" }), false);
});

test("deactivated provider is not sitemap eligible", () => {
  assert.equal(isSitemapProviderEligible({ status: "deactivated" }), false);
});

test("admin route is excluded from indexing metadata", () => {
  assert.deepEqual(adminProvidersMetadata.robots, {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  });
});

test("sitemap does not contain admin URLs", () => {
  const urls = buildPublicSitemapEntries().map((entry) => entry.url);

  assert.equal(urls.some((url) => url.includes("/admin/")), false);
});

test("sitemap does not contain query-parameter profile variants", () => {
  const urls = buildPublicSitemapEntries().map((entry) => entry.url);

  assert.equal(urls.some((url) => url.includes("?")), false);
});

test("sitemap contains expected public profile URLs", () => {
  const urls = buildPublicSitemapEntries().map((entry) => entry.url);

  assert.ok(urls.includes("https://mechanicmatchfl.com/"));
  assert.ok(urls.includes("https://mechanicmatchfl.com/list-your-business"));
  assert.ok(urls.includes("https://mechanicmatchfl.com/mechanics/dev-dade-ac-specialist"));
  assert.equal(urls.includes("https://mechanicmatchfl.com/mechanics/dev-inactive-electrical"), false);
});

test("robots rules do not accidentally block the public site", () => {
  const robots = buildRobotsRules();

  assert.equal(robots.rules[0].allow, "/");
});

test("robots appropriately restrict admin and development surfaces", () => {
  const robots = buildRobotsRules();

  assert.deepEqual(robots.rules[0].disallow, ADMIN_DISALLOW_RULES);
  assert.ok(robots.sitemap.endsWith("/sitemap.xml"));
});

test("physical-provider structured data uses real address only", () => {
  const provider = getPublicProviderById("dev-broward-transmission");
  assert.ok(provider);

  const data = buildProviderStructuredData(provider);
  assert.equal(data["@type"], "AutoRepair");
  assert.deepEqual(data.address, {
    "@type": "PostalAddress",
    streetAddress: "910 SE 17th St",
    addressLocality: "Fort Lauderdale",
    addressRegion: "FL",
    postalCode: "33316",
    addressCountry: "US"
  });
});

test("mobile-provider structured data does not fabricate physical address", () => {
  const provider = getPublicProviderById("dev-dade-mobile");
  assert.ok(provider);

  const data = buildProviderStructuredData(provider);
  assert.equal("address" in data, false);
  assert.deepEqual(data.areaServed, [
    { "@type": "AdministrativeArea", name: "ZIP 33161" },
    { "@type": "AdministrativeArea", name: "ZIP 33130" },
    { "@type": "AdministrativeArea", name: "ZIP 33155" }
  ]);
});

test("structured data does not contain fake rating or review data", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");
  assert.ok(provider);

  const serialized = JSON.stringify(buildProviderStructuredData(provider));
  assert.equal(serialized.includes("aggregateRating"), false);
  assert.equal(serialized.includes("review"), false);
  assert.equal(serialized.includes("priceRange"), false);
  assert.equal(serialized.includes("openingHours"), false);
});

test("structured-data serialization safely handles script-like provider content", () => {
  const provider = DEVELOPMENT_PROVIDERS[0];
  const serialized = serializeJsonLd(
    buildProviderStructuredData({
      ...provider,
      description: "</script><script>alert('seo')</script>"
    })
  );

  assert.equal(serialized.includes("</script"), false);
  assert.ok(serialized.includes("\\u003c/script"));
});

test("unknown provider continues to use proper not-found behavior", () => {
  assert.equal(getPublicProviderById("not-a-provider"), null);
});
