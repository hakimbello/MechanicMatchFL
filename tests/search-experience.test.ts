import assert from "node:assert/strict";
import test from "node:test";

import { DEVELOPMENT_PROVIDERS } from "../src/fixtures/developmentProviders.ts";
import {
  buildSearchRequest,
  runProviderSearch,
  validateSearchInput,
  type SearchFormInput
} from "../src/search/search.ts";

const validAcSearch: SearchFormInput = {
  year: "2015",
  make: "Honda",
  model: "Accord",
  serviceCategory: "ac",
  zip: "33161"
};

test("validates required search fields with customer-facing errors", () => {
  const errors = validateSearchInput({
    year: "",
    make: "",
    model: "",
    serviceCategory: "",
    zip: ""
  });

  assert.equal(errors.year, "Choose your vehicle year.");
  assert.equal(errors.make, "Enter your vehicle make.");
  assert.equal(errors.model, "Enter your vehicle model.");
  assert.equal(errors.serviceCategory, "Choose the repair or service you need.");
  assert.equal(errors.zip, "Enter a valid 5-digit ZIP code.");
});

test("validates ZIP format and launch geography", () => {
  assert.equal(validateSearchInput({ ...validAcSearch, zip: "3316" }).zip, "Enter a valid 5-digit ZIP code.");
  assert.equal(validateSearchInput({ ...validAcSearch, zip: "90210" }).zip, "Enter a Miami-Dade or Broward ZIP code.");
});

test("maps repair category selections into match requests", () => {
  const request = buildSearchRequest({ ...validAcSearch, serviceCategory: "check-engine-light" });

  assert.equal(request.ok, true);
  if (request.ok) {
    assert.equal(request.request.serviceCategory, "check-engine-light");
    assert.deepEqual(request.request.vehicle, { year: 2015, make: "Honda", model: "Accord" });
  }
});

test("search request reaches the matching logic and returns provider results", () => {
  const search = runProviderSearch(validAcSearch);

  assert.equal(search.ok, true);
  if (search.ok) {
    assert.ok(search.results.some((result) => result.id === "dev-dade-ac-specialist"));
  }
});

test("search results link to stable provider profile routes", () => {
  const search = runProviderSearch(validAcSearch);

  assert.equal(search.ok, true);
  if (search.ok) {
    assert.equal(search.results[0].profileHref, "/mechanics/dev-dade-ac-specialist?service=ac&make=Honda&zip=33161");
  }
});

test("results preserve matching-engine order", () => {
  const search = runProviderSearch(validAcSearch);

  assert.equal(search.ok, true);
  if (search.ok) {
    assert.deepEqual(
      search.results.slice(0, 3).map((result) => result.id),
      ["dev-dade-ac-specialist", "dev-dade-mobile", "dev-dade-general-honda"]
    );
  }
});

test("mobile mechanics show service-area semantics instead of fake physical distance", () => {
  const search = runProviderSearch(validAcSearch);

  assert.equal(search.ok, true);
  if (search.ok) {
    const mobile = search.results.find((result) => result.id === "dev-dade-mobile");
    assert.equal(mobile?.locationLine, "Serves your area");
    assert.ok(mobile?.reasons.includes("Serves your area"));
    assert.ok(!mobile?.reasons.some((reason) => reason.includes("miles away")));
  }
});

test("physical providers can display approximate distance when available", () => {
  const search = runProviderSearch({
    year: "2012",
    make: "Ford",
    model: "F-150",
    serviceCategory: "transmission",
    zip: "33311"
  });

  assert.equal(search.ok, true);
  if (search.ok) {
    const specialist = search.results.find((result) => result.id === "dev-broward-transmission");
    assert.ok(specialist?.reasons.some((reason) => reason.endsWith("miles away")));
  }
});

test("returns a clear no-match state input when no providers match", () => {
  const search = runProviderSearch({
    year: "2010",
    make: "Saab",
    model: "9-3",
    serviceCategory: "engine",
    zip: "33161"
  });

  assert.equal(search.ok, true);
  if (search.ok) {
    assert.deepEqual(search.results, []);
  }
});

test("inactive providers remain absent from search results", () => {
  const search = runProviderSearch({
    year: "2020",
    make: "Toyota",
    model: "Camry",
    serviceCategory: "electrical",
    zip: "33161"
  });

  assert.equal(search.ok, true);
  if (search.ok) {
    assert.ok(search.results.every((result) => result.id !== "dev-inactive-electrical"));
  }
});

test("customer-facing match reasons are derived from actual match data", () => {
  const search = runProviderSearch(validAcSearch, DEVELOPMENT_PROVIDERS);

  assert.equal(search.ok, true);
  if (search.ok) {
    const specialist = search.results[0];
    assert.equal(specialist.id, "dev-dade-ac-specialist");
    assert.ok(specialist.reasons.includes("AC specialist"));
    assert.ok(specialist.reasons.includes("Works on Honda vehicles"));
    assert.ok(specialist.reasons.includes("Verified profile"));
    assert.ok(!specialist.reasons.some((reason) => reason.startsWith("service:")));
  }
});
