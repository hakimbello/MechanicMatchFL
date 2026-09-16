import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMechanicContactEvent,
  buildMechanicProfileViewedEvent,
  buildMechanicSearchResultsViewedEvent,
  buildMechanicSearchSubmittedEvent,
  buildProviderSubmissionCompletedEvent
} from "../src/analytics/events.ts";
import { sendAnalyticsEvent } from "../src/analytics/client.ts";
import type { ProviderStatus } from "../src/domain/providers.ts";
import { buildContactActions, buildEmailAction, buildPhoneAction, buildWebsiteAction } from "../src/profiles/contact.ts";
import { buildProviderProfileView, getPublicProviderById } from "../src/profiles/providerProfiles.ts";
import { adminProvidersMetadata } from "../src/seo/metadata.ts";
import { buildProviderStructuredData, serializeJsonLd } from "../src/seo/structuredData.ts";
import { SECURITY_HEADERS } from "../src/security/headers.ts";
import { canTransitionProviderStatus, transitionProviderSubmission } from "../src/submissions/lifecycle.ts";
import { convertSubmissionToProvider } from "../src/submissions/publication.ts";
import type { ProviderSubmissionInput, ProviderSubmissionRecord } from "../src/submissions/submissionTypes.ts";
import { EMPTY_PROVIDER_SUBMISSION } from "../src/submissions/submissionTypes.ts";
import { createSubmittedProviderRecord } from "../src/submissions/validation.ts";

const validSubmission: ProviderSubmissionInput = {
  ...EMPTY_PROVIDER_SUBMISSION,
  businessName: "Privacy Boundary Auto",
  phone: "(305) 555-0303",
  email: "owner@privacyboundary.test",
  providerType: "independent-auto-repair-shop",
  locationKind: "physical",
  street: "500 Private Ave",
  city: "Miami",
  county: "Miami-Dade",
  zip: "33130",
  services: ["general-repair"],
  allMakes: true,
  description: "Fictional provider for privacy boundary tests.",
  registrationNumber: "REG-PRIVATE-1",
  authorizationRelationship: "my-business",
  authorizationAttested: true
};

function submittedRecord(): ProviderSubmissionRecord {
  const result = createSubmittedProviderRecord(validSubmission, new Date("2026-09-15T12:00:00.000Z"), "privacy-boundary");
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid submission");
  }
  return result.record;
}

function move(record: ProviderSubmissionRecord, statuses: ProviderStatus[]): ProviderSubmissionRecord {
  return statuses.reduce((current, status) => transitionProviderSubmission(current, status), record);
}

test("search analytics event contains allowed properties", () => {
  const event = buildMechanicSearchSubmittedEvent({
    serviceCategory: "ac",
    vehicleMake: "Honda",
    zip: "33161"
  });

  assert.equal(event.name, "mechanic_search_submitted");
  assert.deepEqual(event.properties, {
    service_category: "ac",
    vehicle_make: "Honda",
    launch_area: "Miami-Dade"
  });
});

test("search analytics event excludes raw ZIP", () => {
  const event = buildMechanicSearchSubmittedEvent({
    serviceCategory: "brakes",
    vehicleMake: "Toyota",
    zip: "33311"
  });

  assert.equal(JSON.stringify(event).includes("33311"), false);
  assert.equal(event.properties.launch_area, "Broward");
});

test("search analytics launch-area classification covers expanded launch ZIPs", () => {
  assert.equal(
    buildMechanicSearchSubmittedEvent({
      serviceCategory: "brakes",
      vehicleMake: "Toyota",
      zip: "33304"
    }).properties.launch_area,
    "Broward"
  );
  assert.equal(
    buildMechanicSearchSubmittedEvent({
      serviceCategory: "maintenance",
      vehicleMake: "Ford",
      zip: "33012"
    }).properties.launch_area,
    "Miami-Dade"
  );
});

test("search analytics event excludes customer PII fields", () => {
  const event = buildMechanicSearchSubmittedEvent({
    serviceCategory: "maintenance",
    vehicleMake: "Ford",
    zip: "33130"
  });

  assert.equal("customer_name" in event.properties, false);
  assert.equal("customer_email" in event.properties, false);
  assert.equal("customer_phone" in event.properties, false);
  assert.equal("vehicle_model" in event.properties, false);
  assert.equal("zip" in event.properties, false);
});

test("result event contains result count without provider or customer PII", () => {
  const event = buildMechanicSearchResultsViewedEvent({
    serviceCategory: "ac",
    resultCount: 2
  });

  assert.deepEqual(event.properties, {
    service_category: "ac",
    result_count: 2
  });
  assert.equal(JSON.stringify(event).includes("@"), false);
  assert.equal(JSON.stringify(event).includes("555"), false);
});

test("profile event contains provider ID and type but not provider contact PII", () => {
  const event = buildMechanicProfileViewedEvent({
    providerId: "dev-dade-mobile",
    providerType: "mobile-mechanic",
    serviceCategory: "ac"
  });

  assert.deepEqual(event.properties, {
    provider_id: "dev-dade-mobile",
    provider_type: "mobile-mechanic",
    service_category: "ac"
  });
  assert.equal("provider_email" in event.properties, false);
  assert.equal("provider_phone" in event.properties, false);
});

test("contact event preserves provider ID and contact method behavior", () => {
  const event = buildMechanicContactEvent({
    providerId: "dev-dade-ac-specialist",
    contactMethod: "phone",
    sourcePage: "profile",
    serviceCategory: "ac"
  });

  assert.equal(event.name, "mechanic_contact_clicked");
  assert.equal(event.properties.provider_id, "dev-dade-ac-specialist");
  assert.equal(event.properties.contact_method, "phone");
});

test("contact event excludes phone and email values", () => {
  const event = buildMechanicContactEvent({
    providerId: "dev-dade-ac-specialist",
    contactMethod: "email",
    sourcePage: "profile"
  });

  assert.equal(JSON.stringify(event).includes("555"), false);
  assert.equal(JSON.stringify(event).includes("@"), false);
});

test("provider submission event excludes submitted form PII", () => {
  const event = buildProviderSubmissionCompletedEvent({
    providerType: "independent-auto-repair-shop",
    locationKind: "physical"
  });

  assert.deepEqual(event.properties, {
    provider_type: "independent-auto-repair-shop",
    location_kind: "physical"
  });
  assert.equal(JSON.stringify(event).includes("privacyboundary.test"), false);
  assert.equal(JSON.stringify(event).includes("500 Private"), false);
  assert.equal(JSON.stringify(event).includes("REG-PRIVATE"), false);
});

test("analytics failure does not break core interaction", () => {
  assert.doesNotThrow(() =>
    sendAnalyticsEvent(buildMechanicSearchResultsViewedEvent({ serviceCategory: "ac", resultCount: 1 }), () => {
      throw new Error("blocked analytics");
    })
  );
});

test("event names are stable and typed", () => {
  assert.deepEqual(
    [
      buildMechanicSearchSubmittedEvent({ serviceCategory: "ac", vehicleMake: "Honda" }).name,
      buildMechanicSearchResultsViewedEvent({ serviceCategory: "ac", resultCount: 1 }).name,
      buildMechanicProfileViewedEvent({ providerId: "provider", providerType: "repair-specialist" }).name,
      buildMechanicContactEvent({ providerId: "provider", contactMethod: "phone", sourcePage: "profile" }).name,
      buildProviderSubmissionCompletedEvent({ providerType: "mobile-mechanic", locationKind: "mobile" }).name
    ],
    [
      "mechanic_search_submitted",
      "mechanic_search_results_viewed",
      "mechanic_profile_viewed",
      "mechanic_contact_clicked",
      "provider_submission_completed"
    ]
  );
});

test("privacy page exists", () => {
  const page = readFileSync("app/privacy/page.tsx", "utf8");

  assert.match(page, /Privacy at MechanicMatchFL/);
});

test("privacy page does not claim unsupported compliance", () => {
  const page = readFileSync("app/privacy/page.tsx", "utf8").toLowerCase();

  assert.equal(page.includes("gdpr compliant"), false);
  assert.equal(page.includes("ccpa compliant"), false);
  assert.equal(page.includes("hipaa compliant"), false);
  assert.equal(page.includes("soc 2"), false);
  assert.equal(page.includes("zero data collection"), false);
});

test("privacy page accurately identifies analytics", () => {
  const page = readFileSync("app/privacy/page.tsx", "utf8");

  assert.match(page, /Vercel Web Analytics/);
  assert.match(page, /raw customer ZIP codes/);
});

test("privacy page is discoverably linked", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");

  assert.match(layout, /href="\/privacy"/);
});

test("javascript provider website remains non-actionable", () => {
  assert.equal(buildWebsiteAction("javascript:alert(1)"), null);
});

test("data provider website remains non-actionable", () => {
  assert.equal(buildWebsiteAction("data:text/html,<script>alert(1)</script>"), null);
});

test("malformed phone remains non-actionable", () => {
  assert.equal(buildPhoneAction("12345"), null);
});

test("malformed email remains non-actionable", () => {
  assert.equal(buildEmailAction("not-an-email"), null);
});

test("JSON-LD script breakout remains escaped", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");
  assert.ok(provider);

  const serialized = serializeJsonLd(
    buildProviderStructuredData({
      ...provider,
      name: "</script><script>alert(1)</script>"
    })
  );

  assert.equal(serialized.includes("</script"), false);
  assert.ok(serialized.includes("\\u003c/script"));
});

test("non-active provider remains non-public", () => {
  assert.equal(getPublicProviderById("dev-inactive-electrical"), null);
});

test("authorization attestation does not leak into public profile", () => {
  const provider = convertSubmissionToProvider(move(submittedRecord(), ["under-review", "approved", "active"]));
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  const serialized = JSON.stringify(profile);
  assert.equal(serialized.includes("authorization"), false);
  assert.equal(serialized.includes("attestation"), false);
});

test("internal lifecycle status does not leak into public profile", () => {
  const provider = getPublicProviderById("dev-dade-mobile");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.equal("status" in profile, false);
});

test("registration submission does not automatically become public verified claim", () => {
  const provider = convertSubmissionToProvider(move(submittedRecord(), ["under-review", "approved", "active"]));
  assert.ok(provider);

  assert.equal(provider.trust?.verified, false);
  assert.equal(JSON.stringify(buildProviderProfileView(provider)).includes("REG-PRIVATE"), false);
});

test("invalid lifecycle transitions remain blocked", () => {
  assert.equal(canTransitionProviderStatus("submitted", "active"), false);
});

test("admin route retains noindex protection", () => {
  assert.deepEqual(adminProvidersMetadata.robots, {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  });
});

test("admin route no longer depends on the development-only production guard", () => {
  const adminPage = readFileSync("app/admin/providers/page.tsx", "utf8");

  assert.match(adminPage, /getAdminAuthorization/);
  assert.equal(adminPage.includes("isDevelopmentAdminRouteAvailable"), false);
  assert.equal(adminPage.includes("notFound"), false);
});

test("security headers configuration behaves as expected", () => {
  assert.deepEqual(SECURITY_HEADERS, [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "X-Frame-Options", value: "DENY" }
  ]);
});

test("no secrets are intentionally exposed through analytics configuration", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const packageJson = readFileSync("package.json", "utf8");

  assert.match(packageJson, /@vercel\/analytics/);
  assert.match(layout, /<Analytics \/>/);
  assert.equal(layout.includes("dsn="), false);
  assert.equal(layout.includes("endpoint="), false);
});

test("unsafe provider website does not produce a public contact action", () => {
  const provider = getPublicProviderById("dev-broward-general");
  assert.ok(provider);

  assert.equal(buildContactActions(provider).some((action) => action.method === "website"), false);
});
