import assert from "node:assert/strict";
import test from "node:test";

import { matchProviders } from "../src/domain/matching.ts";
import type { MatchRequest, Provider } from "../src/domain/providers.ts";

const acRequest: MatchRequest = {
  serviceCategory: "ac",
  vehicle: { year: 2015, make: "Honda", model: "Accord" },
  zip: "33161"
};

const transmissionRequest: MatchRequest = {
  serviceCategory: "transmission",
  vehicle: { year: 2012, make: "Ford", model: "F-150" },
  zip: "33311"
};

const providers: Provider[] = [
  {
    id: "ac-specialist-miami",
    name: "Arctic Air Auto",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "1200 SW 67th Ave",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33155",
      coordinates: { latitude: 25.737, longitude: -80.315 }
    },
    services: ["ac", "electrical-diagnostics"],
    allMakes: true,
    trust: { verified: true, claimedProfile: true },
    description: "Automotive AC and diagnostics specialist."
  },
  {
    id: "mobile-north-miami",
    name: "North Miami Mobile Mechanics",
    type: "mobile-mechanic",
    status: "active",
    locationKind: "mobile",
    mobileServiceArea: { zipCodes: ["33161", "33130"] },
    services: ["general-repair", "ac", "maintenance"],
    allMakes: true,
    trust: { claimedProfile: true }
  },
  {
    id: "maintenance-only-nearby",
    name: "Quick Maintenance Nearby",
    type: "independent-auto-repair-shop",
    status: "active",
    locationKind: "physical",
    address: {
      street: "10 NE 125th St",
      city: "North Miami",
      county: "Miami-Dade",
      zip: "33161",
      coordinates: { latitude: 25.891, longitude: -80.18 }
    },
    services: ["maintenance"],
    allMakes: true
  },
  {
    id: "transmission-specialist-broward",
    name: "Broward Transmission Pros",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "400 NW 27th Ave",
      city: "Fort Lauderdale",
      county: "Broward",
      zip: "33311",
      coordinates: { latitude: 26.15, longitude: -80.18 }
    },
    services: ["transmission"],
    allMakes: false,
    makesServiced: ["Ford", "Chevrolet", "Honda"],
    specialtyMakes: ["Ford"],
    trust: { verified: true }
  },
  {
    id: "generic-broward",
    name: "Central Broward Auto Repair",
    type: "independent-auto-repair-shop",
    status: "active",
    locationKind: "physical",
    address: {
      street: "50 NW 20th Ave",
      city: "Fort Lauderdale",
      county: "Broward",
      zip: "33311",
      coordinates: { latitude: 26.145, longitude: -80.174 }
    },
    services: ["general-repair", "maintenance"],
    allMakes: true
  },
  {
    id: "honda-brakes",
    name: "Honda Brake Shop",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "500 SW 8th St",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33130"
    },
    services: ["brakes"],
    allMakes: false,
    makesServiced: ["Honda"]
  },
  {
    id: "toyota-brakes",
    name: "Toyota Brake Shop",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "501 SW 8th St",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33130"
    },
    services: ["brakes"],
    allMakes: false,
    makesServiced: ["Toyota"]
  },
  {
    id: "inactive-ac-shop",
    name: "Inactive AC Shop",
    type: "repair-specialist",
    status: "deactivated",
    locationKind: "physical",
    address: {
      street: "1 Biscayne Blvd",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33161"
    },
    services: ["ac"],
    allMakes: true
  },
  {
    id: "outside-mobile",
    name: "South Beach Mobile Mechanics",
    type: "mobile-mechanic",
    status: "active",
    locationKind: "mobile",
    mobileServiceArea: { zipCodes: ["33139"] },
    services: ["ac", "general-repair"],
    allMakes: true
  }
];

test("returns correct service matches for a customer category", () => {
  const matches = matchProviders(acRequest, providers);
  const ids = matches.map((match) => match.provider.id);

  assert.equal(matches[0].provider.id, "ac-specialist-miami");
  assert.ok(ids.includes("mobile-north-miami"));
  assert.ok(!ids.includes("maintenance-only-nearby"));
});

test("excludes providers with incompatible services", () => {
  const matches = matchProviders(
    { serviceCategory: "electrical", vehicle: { make: "Honda" }, zip: "33161" },
    providers
  );

  assert.ok(matches.every((match) => match.provider.id !== "toyota-brakes"));
  assert.ok(matches.every((match) => match.score.service > 0));
});

test("enforces vehicle make compatibility", () => {
  const matches = matchProviders(
    { serviceCategory: "brakes", vehicle: { make: "Honda" }, zip: "33130" },
    providers
  );
  const ids = matches.map((match) => match.provider.id);

  assert.ok(ids.includes("honda-brakes"));
  assert.ok(!ids.includes("toyota-brakes"));
});

test("allows all-makes providers to match any requested make", () => {
  const matches = matchProviders(
    { serviceCategory: "maintenance", vehicle: { make: "Nissan" }, zip: "33161" },
    providers
  );

  assert.ok(matches.some((match) => match.provider.id === "maintenance-only-nearby"));
});

test("uses physical shop geography without making distance the only factor", () => {
  const matches = matchProviders(acRequest, providers);
  const specialist = matches.find((match) => match.provider.id === "ac-specialist-miami");
  const mobile = matches.find((match) => match.provider.id === "mobile-north-miami");

  assert.ok(specialist?.distanceMiles);
  assert.ok(mobile);
  assert.equal(matches[0].provider.id, "ac-specialist-miami");
});

test("includes mobile mechanics when the customer is inside the service area", () => {
  const matches = matchProviders(acRequest, providers);

  assert.ok(matches.some((match) => match.provider.id === "mobile-north-miami"));
});

test("matches same-county physical providers for launch ZIPs without centroid data", () => {
  const matches = matchProviders({ ...acRequest, zip: "33101" }, providers);
  const specialist = matches.find((match) => match.provider.id === "ac-specialist-miami");

  assert.ok(specialist);
  assert.equal(specialist.distanceMiles, undefined);
  assert.ok(specialist.reasons.includes("geography:shop-launch-county"));
});

test("rejects physical providers outside the launch ZIP county when no distance can be trusted", () => {
  const matches = matchProviders(
    { serviceCategory: "transmission", vehicle: { make: "Ford" }, zip: "33101" },
    providers
  );

  assert.ok(matches.every((match) => match.provider.address?.county !== "Broward"));
});

test("excludes mobile mechanics outside their service area", () => {
  const matches = matchProviders(acRequest, providers);

  assert.ok(matches.every((match) => match.provider.id !== "outside-mobile"));
});

test("excludes inactive and deactivated providers", () => {
  const matches = matchProviders(acRequest, providers);

  assert.ok(matches.every((match) => match.provider.status === "active"));
  assert.ok(matches.every((match) => match.provider.id !== "inactive-ac-shop"));
});

test("ranks a relevant specialist over a generic nearby provider", () => {
  const matches = matchProviders(transmissionRequest, providers);

  assert.equal(matches[0].provider.id, "transmission-specialist-broward");
  assert.ok(
    matches.findIndex((match) => match.provider.id === "transmission-specialist-broward") <
      matches.findIndex((match) => match.provider.id === "generic-broward")
  );
});

test("uses deterministic ordering for tied scores", () => {
  const tiedProviders: Provider[] = [
    {
      id: "tie-beta",
      name: "Beta Auto",
      type: "independent-auto-repair-shop",
      status: "active",
      locationKind: "physical",
      address: {
        street: "1 Test Ave",
        city: "Miami",
        county: "Miami-Dade",
        zip: "33161"
      },
      services: ["maintenance"],
      allMakes: true
    },
    {
      id: "tie-alpha",
      name: "Alpha Auto",
      type: "independent-auto-repair-shop",
      status: "active",
      locationKind: "physical",
      address: {
        street: "2 Test Ave",
        city: "Miami",
        county: "Miami-Dade",
        zip: "33161"
      },
      services: ["maintenance"],
      allMakes: true
    }
  ];

  const matches = matchProviders(
    { serviceCategory: "maintenance", vehicle: { make: "Kia" }, zip: "33161" },
    tiedProviders
  );

  assert.deepEqual(
    matches.map((match) => match.provider.id),
    ["tie-alpha", "tie-beta"]
  );
});
