import assert from "node:assert/strict";
import test from "node:test";

import { buildMechanicContactEvent, recordMechanicContactClick } from "../src/analytics/contactEvents.ts";
import { DEVELOPMENT_PROVIDERS } from "../src/fixtures/developmentProviders.ts";
import { buildContactActions, buildWebsiteAction } from "../src/profiles/contact.ts";
import {
  buildProfileHref,
  buildProviderProfileView,
  getPublicProviderById
} from "../src/profiles/providerProfiles.ts";

test("builds stable mechanic profile hrefs from provider IDs", () => {
  assert.equal(buildProfileHref("dev-dade-ac-specialist"), "/mechanics/dev-dade-ac-specialist");
  assert.equal(
    buildProfileHref("dev-dade-ac-specialist", { serviceCategory: "ac", make: "Honda", zip: "33161" }),
    "/mechanics/dev-dade-ac-specialist?service=ac&make=Honda&zip=33161"
  );
});

test("valid provider profile resolves from public active provider data", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");

  assert.ok(provider);
  assert.equal(provider.name, "Bayfront Auto Climate");
});

test("unknown provider resolves to null for not-found behavior", () => {
  assert.equal(getPublicProviderById("not-a-provider"), null);
});

test("provider name and type render from provider data", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.equal(profile.name, "Bayfront Auto Climate");
  assert.equal(profile.providerType, "Repair specialist");
});

test("physical shop location renders from provider address", () => {
  const provider = getPublicProviderById("dev-broward-transmission");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.equal(profile.locationKind, "Physical shop");
  assert.equal(profile.locationLine, "Fort Lauderdale, Broward, 33316");
});

test("mobile mechanic service-area semantics render without fake shop address", () => {
  const provider = getPublicProviderById("dev-dade-mobile");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.equal(profile.locationKind, "Mobile mechanic");
  assert.equal(profile.locationLine, "Mobile mechanic serving selected ZIP codes");
  assert.equal(profile.serviceAreaLine, "Serves ZIP codes 33161, 33130, 33155");
});

test("services and specialties derive from provider data", () => {
  const provider = getPublicProviderById("dev-broward-transmission");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.deepEqual(profile.services, ["Transmission specialist"]);
});

test("vehicle and make information derives from provider data", () => {
  const provider = getPublicProviderById("dev-broward-transmission");
  assert.ok(provider);

  const profile = buildProviderProfileView(provider);
  assert.equal(profile.makesLine, "Works on Ford, Chevrolet, Honda");
  assert.equal(profile.specialtyMakesLine, "Specializes in Ford");
});

test("phone CTA is generated correctly from valid provider phone", () => {
  const provider = getPublicProviderById("dev-dade-ac-specialist");
  assert.ok(provider);

  const phoneAction = buildContactActions(provider).find((action) => action.method === "phone");
  assert.equal(phoneAction?.label, "Call Mechanic");
  assert.equal(phoneAction?.href, "tel:+13055550148");
  assert.equal(phoneAction?.displayValue, "(305) 555-0148");
  assert.equal(phoneAction?.primary, true);
});

test("email CTA is generated correctly where email exists", () => {
  const provider = getPublicProviderById("dev-broward-transmission");
  assert.ok(provider);

  const emailAction = buildContactActions(provider).find((action) => action.method === "email");
  assert.equal(emailAction?.label, "Email Mechanic");
  assert.equal(emailAction?.href, "mailto:service@riverwalktransmission.test");
});

test("unsafe website protocols are not rendered as actionable external links", () => {
  assert.equal(buildWebsiteAction("javascript:alert('xss')"), null);

  const provider = getPublicProviderById("dev-broward-general");
  assert.ok(provider);
  assert.equal(buildContactActions(provider).some((action) => action.method === "website"), false);
});

test("contact measurement helper receives provider ID and contact method without customer PII", () => {
  const event = buildMechanicContactEvent({
    providerId: "dev-dade-ac-specialist",
    contactMethod: "phone",
    sourcePage: "profile",
    serviceCategory: "ac"
  });

  assert.deepEqual(event, {
    name: "mechanic_contact_clicked",
    properties: {
      provider_id: "dev-dade-ac-specialist",
      contact_method: "phone",
      source_page: "profile",
      service_category: "ac"
    }
  });
  assert.equal(JSON.stringify(event).includes("555"), false);
  assert.equal(JSON.stringify(event).includes("@"), false);

  const captured = [] as unknown[];
  recordMechanicContactClick(
    {
      providerId: "dev-dade-ac-specialist",
      contactMethod: "email",
      sourcePage: "profile"
    },
    (payload) => captured.push(payload)
  );
  assert.equal(captured.length, 1);
});

test("inactive development providers cannot become public profiles", () => {
  const inactiveProvider = DEVELOPMENT_PROVIDERS.find((provider) => provider.id === "dev-inactive-electrical");

  assert.equal(inactiveProvider?.status, "deactivated");
  assert.equal(getPublicProviderById("dev-inactive-electrical"), null);
});
