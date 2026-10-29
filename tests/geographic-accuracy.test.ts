import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CENSUS_ZCTA_2026_CENTROIDS } from "../src/geography/censusZcta2026Centroids.ts";
import {
  getLaunchZipCoordinates,
  getLaunchZipInfo,
  hasLaunchZipCoordinates,
  isLaunchZip
} from "../src/geography/launchGeography.ts";

const documentation = readFileSync("docs/geography-data.md", "utf8");

test("stores the documented 2026 Census ZCTA launch-area extract locally", () => {
  assert.equal(Object.keys(CENSUS_ZCTA_2026_CENTROIDS).length, 135);
  assert.deepEqual(CENSUS_ZCTA_2026_CENTROIDS["33161"], {
    latitude: 25.893543,
    longitude: -80.183272
  });
  assert.deepEqual(CENSUS_ZCTA_2026_CENTROIDS["33311"], {
    latitude: 26.144208,
    longitude: -80.172785
  });
  assert.match(documentation, /U\.S\. Census Bureau 2026/);
  assert.match(documentation, /F1E9046B91F6E60686A99343CB2752834C02B0764939403B331C78C017E2C54C/);
  assert.match(documentation, /not subject to U\.S\.\s+copyright protection/);
});

test("preserves border ZIP county metadata without using fabricated coordinates", () => {
  const borderZip = getLaunchZipInfo("33196");

  assert.ok(borderZip);
  assert.deepEqual(borderZip.counties, ["Miami-Dade", "Broward"]);
  assert.deepEqual(borderZip.coordinates, CENSUS_ZCTA_2026_CENTROIDS["33196"]);
});

test("distinguishes launch ZIP recognition from trusted coordinate availability", () => {
  assert.equal(isLaunchZip("33102"), true);
  assert.equal(hasLaunchZipCoordinates("33102"), false);
  assert.equal(getLaunchZipCoordinates("33102"), undefined);
  assert.equal(isLaunchZip("90210"), false);
});
