import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEVELOPMENT_PROVIDERS } from "../src/fixtures/developmentProviders.ts";
import { buildLocaleSwitchHref, localeAlternates, localeFromPathname, localizePublicPath } from "../src/i18n/locale.ts";
import { getPublicMessages } from "../src/i18n/messages.ts";
import { buildProviderProfileView } from "../src/profiles/providerProfiles.ts";
import { runProviderSearch, validateSearchInput, type SearchFormInput } from "../src/search/search.ts";
import { buildHomeMetadata, buildMechanicProfileMetadata } from "../src/seo/metadata.ts";
import { buildPublicSitemapEntries } from "../src/seo/sitemap.ts";

const validSearch: SearchFormInput = { year: "2015", make: "Honda", model: "Accord", serviceCategory: "ac", zip: "33161" };

test("English is the default locale and Spanish uses the /es prefix", () => {
  assert.equal(localeFromPathname("/"), "en");
  assert.equal(localeFromPathname("/mechanics/provider-1"), "en");
  assert.equal(localeFromPathname("/es"), "es");
  assert.equal(localizePublicPath("/mechanics/provider-1", "es"), "/es/mechanics/provider-1");
  assert.equal(localizePublicPath("/es/privacy", "en"), "/privacy");
});

test("locale switcher preserves only validated public search context", () => {
  const query = new URLSearchParams({ service: "ac", make: "Honda", zip: "33161", token: "secret", status: "verified", callback: "https://evil.test" });
  assert.equal(buildLocaleSwitchHref("/mechanics/provider-1", "es", query), "/es/mechanics/provider-1?service=ac&make=Honda&zip=33161");
  assert.equal(buildLocaleSwitchHref("/reviews/verify", "es", query), "/es/reviews/verify");
  assert.equal(buildLocaleSwitchHref("/", "es", new URLSearchParams({ zip: "bad", service: "invented" })), "/es");
});

test("verification locale switches never copy tokens, status, or arbitrary query data", () => {
  const sensitive = new URLSearchParams({
    token: "verification-token",
    status: "verified",
    service: "ac",
    make: "Honda",
    zip: "33161",
    next: "https://example.test"
  });
  assert.equal(buildLocaleSwitchHref("/reviews/verify", "es", sensitive), "/es/reviews/verify");
  assert.equal(buildLocaleSwitchHref("/es/reviews/verify", "en", sensitive), "/reviews/verify");
});

test("providerId is preserved only for the confidential safety route", () => {
  const query = new URLSearchParams({ providerId: "provider_123" });
  assert.equal(buildLocaleSwitchHref("/safety/report", "es", query), "/es/safety/report?providerId=provider_123");
  assert.equal(buildLocaleSwitchHref("/mechanics/provider_123", "es", query), "/es/mechanics/provider_123");
});

test("English and Spanish searches preserve eligibility, ranking, and stable IDs", () => {
  const english = runProviderSearch(validSearch, DEVELOPMENT_PROVIDERS, "en");
  const spanish = runProviderSearch(validSearch, DEVELOPMENT_PROVIDERS, "es");
  assert.equal(english.ok, true);
  assert.equal(spanish.ok, true);
  if (english.ok && spanish.ok) {
    assert.deepEqual(spanish.results.map(({ id }) => id), english.results.map(({ id }) => id));
    assert.ok(spanish.results.every(({ profileHref }) => profileHref.startsWith("/es/mechanics/")));
    assert.equal(spanish.results.some(({ id }) => id === "dev-inactive-electrical"), false);
  }
});

test("Spanish validation is localized without changing acceptance", () => {
  const english = validateSearchInput({ ...validSearch, zip: "bad" }, "en");
  const spanish = validateSearchInput({ ...validSearch, zip: "bad" }, "es");
  assert.ok(english.zip);
  assert.ok(spanish.zip);
  assert.notEqual(spanish.zip, english.zip);
  assert.deepEqual(validateSearchInput(validSearch, "es"), {});
});

test("provider-authored content and proper names remain verbatim across locales", () => {
  const provider = DEVELOPMENT_PROVIDERS[0];
  const english = buildProviderProfileView(provider, undefined, "en");
  const spanish = buildProviderProfileView(provider, undefined, "es");
  assert.equal(spanish.id, english.id);
  assert.equal(spanish.name, provider.name);
  assert.equal(spanish.description, provider.description);
  assert.deepEqual(spanish.contactActions.map(({ href }) => href), english.contactActions.map(({ href }) => href));
  assert.notEqual(spanish.providerType, english.providerType);
});

test("localized metadata has reciprocal canonicals and hreflang annotations", () => {
  const englishHome = buildHomeMetadata("en");
  const spanishHome = buildHomeMetadata("es");
  assert.equal(englishHome.alternates?.canonical, "/");
  assert.equal(spanishHome.alternates?.canonical, "/es");
  assert.deepEqual(spanishHome.alternates?.languages, localeAlternates("/").languages);

  const provider = DEVELOPMENT_PROVIDERS[0];
  const spanishProfile = buildMechanicProfileMetadata(provider, "es");
  assert.equal(spanishProfile.alternates?.canonical, `/es/mechanics/${provider.id}`);
  assert.equal(spanishProfile.description, provider.description);
});

test("sitemap lists both locales with reciprocal alternates", () => {
  const entries = buildPublicSitemapEntries(DEVELOPMENT_PROVIDERS);
  const urls = entries.map(({ url }) => url);
  assert.ok(urls.includes("https://mechanicmatchfl.com/"));
  assert.ok(urls.includes("https://mechanicmatchfl.com/es"));
  assert.ok(urls.includes("https://mechanicmatchfl.com/es/privacy"));
  assert.ok(urls.includes("https://mechanicmatchfl.com/es/mechanics/dev-dade-ac-specialist"));
  assert.ok(entries.every(({ alternates }) => alternates?.languages["en-US"] && alternates.languages["es-US"]));
});

test("typed dictionaries cover the public trust and form surfaces", () => {
  const english = getPublicMessages("en");
  const spanish = getPublicMessages("es");
  for (const key of ["navigation", "home", "profile", "reviewForm", "verification", "safety", "listing", "validation", "presentation", "metadata"] as const) {
    assert.deepEqual(Object.keys(spanish[key]).sort(), Object.keys(english[key]).sort());
  }
});

test("Spanish routes reuse the same search, review, photo, and persistence boundaries", () => {
  const spanishProfile = readFileSync("app/es/mechanics/[providerId]/page.tsx", "utf8");
  const sharedProfile = readFileSync("app/mechanics/[providerId]/page.tsx", "utf8");
  const navigation = readFileSync("app/public-navigation.tsx", "utf8");
  assert.match(spanishProfile, /renderMechanicProfilePage/);
  assert.match(sharedProfile, /getPublicReviewPersistenceForRuntime/);
  assert.match(sharedProfile, /getPhotoPersistenceForRuntime/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /isVerificationPage/);
  assert.doesNotMatch(navigation, /pathname\.endsWith\("\/reviews\/verify"\)\) return null/);
});

test("verification pages remain noindex, no-referrer, and expose reciprocal locale metadata", () => {
  const english = readFileSync("app/reviews/verify/page.tsx", "utf8");
  const spanish = readFileSync("app/es/reviews/verify/page.tsx", "utf8");
  const analytics = readFileSync("app/site-analytics.tsx", "utf8");
  for (const source of [english, spanish]) {
    assert.match(source, /index: false/);
    assert.match(source, /follow: false/);
    assert.match(source, /referrer: "no-referrer"/);
    assert.match(source, /localeAlternates\("\/reviews\/verify"\)/);
  }
  assert.match(analytics, /stripLocalePrefix\(pathname\) === "\/reviews\/verify"/);
});
