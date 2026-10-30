import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getPublicMessages } from "../src/i18n/messages.ts";
import { buildPrivacyMetadata } from "../src/seo/metadata.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("English and Spanish layouts expose an accessible skip target", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/globals.css");
  assert.match(layout, /className="skip-link" href="#main-content"/);
  assert.match(layout, /id="main-content" tabIndex=\{-1\}/);
  assert.equal(getPublicMessages("en").navigation.skipToContent, "Skip to main content");
  assert.equal(getPublicMessages("es").navigation.skipToContent, "Saltar al contenido principal");
  assert.match(css, /\.skip-link:focus\s*\{[^}]*transform: translateY\(0\)/s);
});

test("primary navigation remains available at mobile widths with visible focus", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.site-navigation\s*\{[^}]*flex-wrap: wrap/s);
  assert.match(css, /\.site-nav-links\s*\{[^}]*display: flex[^}]*width: 100%/s);
  assert.match(css, /:focus-visible[\s\S]*outline: 3px solid var\(--focus\)[\s\S]*box-shadow: 0 0 0 6px #fff/);
});

test("interactive public forms announce validation summaries in both languages", () => {
  const search = read("app/search-experience.tsx");
  const reviews = read("app/mechanics/[providerId]/review-submission-form.tsx");
  const safety = read("app/safety/report/safety-report-form.tsx");
  for (const source of [search, reviews, safety]) {
    assert.match(source, /form-error-summary" role="alert"/);
  }
  assert.match(getPublicMessages("en").home.correctErrors, /Correct/);
  assert.match(getPublicMessages("es").home.correctErrors, /Corrige/);
  assert.match(getPublicMessages("es").reviewForm.correctErrors, /Corrige/);
  assert.match(getPublicMessages("es").safety.correctErrors, /Corrige/);
});

test("privacy metadata has canonical, hreflang, and description parity", () => {
  const english = buildPrivacyMetadata("en");
  const spanish = buildPrivacyMetadata("es");
  assert.equal(english.alternates?.canonical, "/privacy");
  assert.equal(spanish.alternates?.canonical, "/es/privacy");
  assert.deepEqual(english.alternates?.languages, spanish.alternates?.languages);
  assert.match(String(english.description), /reviews, safety reports, photos/);
  assert.match(String(spanish.description), /reseñas, reportes de seguridad, fotos/);
});

test("sensitive HTML routes receive defense-in-depth noindex headers", () => {
  const config = read("next.config.ts");
  const headers = read("src/security/headers.ts");
  for (const route of ["/admin/:path*", "/provider/:path*", "/reviews/verify", "/es/reviews/verify", "/safety/report", "/es/safety/report"]) {
    assert.ok(config.includes(`"${route}"`), `${route} must be protected`);
  }
  assert.match(headers, /X-Robots-Tag[\s\S]*noindex, nofollow, noarchive/);
});

test("photo performance hint preserves controlled private delivery", () => {
  const profile = read("app/mechanics/[providerId]/page.tsx");
  const photoRoute = read("app/provider-photos/[providerId]/route.ts");
  assert.match(profile, /decoding="async" fetchPriority="high"/);
  assert.match(photoRoute, /getPublicPhoto|downloadPublicPhoto/);
  assert.match(photoRoute, /Cache-Control": "private, no-store"/);
});

test("launch checklist keeps migrations, Storage, editorial review, and rollback blocked", () => {
  const checklist = read("docs/m16-launch-readiness-checklist.md");
  for (const requirement of [
    "M11 geographic/profile migration applied: **NOT EXECUTED**",
    "M12 review migration applied: **NOT EXECUTED**",
    "M13 trust and safety migration applied: **NOT EXECUTED**",
    "M14 photo migration applied: **NOT EXECUTED**",
    "M14 private Storage buckets and policies created: **NOT EXECUTED**",
    "native-speaker Spanish editorial review",
    "orphan original and normalized-object reconciliation",
    "rollback"
  ]) assert.ok(checklist.includes(requirement), `missing launch gate: ${requirement}`);
});
