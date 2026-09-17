import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MissingSupabaseConfigurationError,
  SUPABASE_ENVIRONMENT_CONTRACT,
  assertNoServerOnlySupabaseEnvIsClientExposed,
  getSupabaseClientSafeConfig,
  getSupabaseServerSecretConfig
} from "../src/config/supabaseEnvironment.ts";
import type { ProviderStatus } from "../src/domain/providers.ts";
import {
  PUBLIC_PROVIDER_ROW_FIELDS,
  mapPublicProviderRowToProvider,
  mapSubmissionToProviderRecordInsert,
  type PublicProviderRow
} from "../src/providers/providerPersistence.ts";
import { transitionProviderSubmission } from "../src/submissions/lifecycle.ts";
import { EMPTY_PROVIDER_SUBMISSION, type ProviderSubmissionInput, type ProviderSubmissionRecord } from "../src/submissions/submissionTypes.ts";
import { createSubmittedProviderRecord } from "../src/submissions/validation.ts";

const migration = readFileSync("supabase/migrations/202609160001_prepare_provider_persistence.sql", "utf8");
const envExample = readFileSync(".env.example", "utf8");

const validSubmission: ProviderSubmissionInput = {
  ...EMPTY_PROVIDER_SUBMISSION,
  businessName: "Durable Boundary Auto",
  phone: "(305) 555-0404",
  email: "owner@durableboundary.test",
  providerType: "independent-auto-repair-shop",
  locationKind: "physical",
  street: "700 Persistent Ave",
  city: "Miami",
  county: "Miami-Dade",
  zip: "33130",
  services: ["general-repair", "maintenance"],
  allMakes: false,
  makesServiced: "Honda, Toyota",
  description: "Fictional provider for durable persistence boundary tests.",
  registrationNumber: "MV-DURABLE-1",
  authorizationRelationship: "my-business",
  authorizationAttested: true
};

function submittedRecord(input: ProviderSubmissionInput = validSubmission): ProviderSubmissionRecord {
  const result = createSubmittedProviderRecord(input, new Date("2026-09-16T12:00:00.000Z"), "submission-durable");
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid submission");
  }
  return result.record;
}

function move(record: ProviderSubmissionRecord, statuses: ProviderStatus[]): ProviderSubmissionRecord {
  return statuses.reduce((current, status) => transitionProviderSubmission(current, status), record);
}

test("Supabase migration creates private base records and active public projection", () => {
  assert.match(migration, /create table if not exists public\.provider_records/);
  assert.match(migration, /create table if not exists public\.admin_users/);
  assert.match(migration, /create or replace view public\.active_public_providers/);
  assert.match(migration, /where status = 'active'/);
  assert.match(migration, /alter table public\.provider_records enable row level security/);
  assert.match(migration, /revoke all on table public\.provider_records from anon, authenticated/);
  assert.match(migration, /grant select on table public\.active_public_providers to anon, authenticated/);
});

test("Supabase migration enforces lifecycle values and allowed transitions", () => {
  for (const status of ["draft", "submitted", "under-review", "approved", "active", "changes-requested", "rejected", "deactivated"]) {
    assert.match(migration, new RegExp(`'${status}'`));
  }

  assert.match(migration, /is_provider_status_transition_allowed/);
  assert.match(migration, /from_status = 'submitted' and to_status = 'under-review'/);
  assert.match(migration, /from_status = 'approved' and to_status = 'active'/);
  assert.match(migration, /Provider status cannot move from/);
});

test("Supabase migration does not grant public direct insert or update to provider records", () => {
  assert.equal(/grant\s+insert\s+on\s+table\s+public\.provider_records\s+to\s+anon/i.test(migration), false);
  assert.equal(/grant\s+update\s+on\s+table\s+public\.provider_records\s+to\s+anon/i.test(migration), false);
  assert.equal(/create policy .*for insert.*to anon/is.test(migration), false);
  assert.equal(/create policy .*for update.*to anon/is.test(migration), false);
});

test("provider submission mapper preserves private durable fields without self-publishing", () => {
  const row = mapSubmissionToProviderRecordInsert(submittedRecord());

  assert.equal(row.status, "submitted");
  assert.equal(row.business_name, "Durable Boundary Auto");
  assert.equal(row.registration_value, "MV-DURABLE-1");
  assert.equal(row.registration_verification_status, "submitted-unverified");
  assert.equal(row.authorization_relationship, "my-business");
  assert.equal(row.authorization_attested, true);
  assert.equal(row.profile_image_ref, null);
});

test("active public provider projection maps only customer-facing provider data", () => {
  const active = move(submittedRecord(), ["under-review", "approved", "active"]);
  const publicRow: PublicProviderRow = {
    id: active.id,
    name: active.businessName,
    status: "active",
    provider_type: active.providerType,
    location_kind: active.locationKind,
    phone: active.phone,
    email: active.email,
    website: "https://durableboundary.example",
    services: active.services,
    all_makes: active.allMakes,
    makes_serviced: active.makesServiced,
    specialty_makes: active.specialtyMakes,
    street: active.street,
    city: active.city,
    county: active.county,
    zip: active.zip,
    latitude: null,
    longitude: null,
    service_zip_codes: [],
    service_counties: [],
    service_base_zip: null,
    service_radius_miles: null,
    service_base_latitude: null,
    service_base_longitude: null,
    description: active.description,
    claimed_profile: false,
    verified: false,
    verified_at: null
  };

  const provider = mapPublicProviderRowToProvider(publicRow);
  assert.ok(provider);
  assert.equal(provider.status, "active");
  assert.equal(provider.contact?.website, "https://durableboundary.example");
  assert.equal(JSON.stringify(provider).includes("authorization"), false);
  assert.equal(JSON.stringify(provider).includes("registration"), false);
});

test("non-active public provider rows are not mapped as public providers", () => {
  assert.equal(
    mapPublicProviderRowToProvider({
      id: "not-public",
      name: "Not Public",
      status: "approved",
      provider_type: "repair-specialist",
      location_kind: "mobile",
      phone: "3055550404",
      email: "notpublic@example.test",
      services: ["general-repair"],
      all_makes: true,
      description: "Fictional approved provider that is not active.",
      claimed_profile: false,
      verified: false
    }),
    null
  );
});

test("public projection field list excludes admin and authorization fields", () => {
  const serialized = JSON.stringify(PUBLIC_PROVIDER_ROW_FIELDS);

  assert.equal(serialized.includes("authorization"), false);
  assert.equal(serialized.includes("admin_notes"), false);
  assert.equal(serialized.includes("last_reviewed_by"), false);
  assert.equal(serialized.includes("registration"), false);
});

test("Supabase environment contract separates client-safe and server-only values", () => {
  assert.deepEqual(SUPABASE_ENVIRONMENT_CONTRACT.clientSafe, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  ]);
  assert.deepEqual(SUPABASE_ENVIRONMENT_CONTRACT.serverOnly, ["SUPABASE_SECRET_KEY"]);
  assert.doesNotThrow(() => assertNoServerOnlySupabaseEnvIsClientExposed());
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me/);
  assert.match(envExample, /SUPABASE_SECRET_KEY=sb_secret_replace_me/);
});

test("Supabase environment validation preserves client-missing and server-secret boundaries", () => {
  const clientConfig = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.test",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key"
  };

  assert.deepEqual(getSupabaseClientSafeConfig(clientConfig), {
    url: "https://example.test",
    publishableKey: "public-test-key"
  });
  assert.throws(
    () => getSupabaseClientSafeConfig({ ...clientConfig, NEXT_PUBLIC_SUPABASE_URL: "" }),
    MissingSupabaseConfigurationError
  );
  assert.deepEqual(getSupabaseServerSecretConfig({ ...clientConfig, SUPABASE_SECRET_KEY: "server-test-key" }), {
    url: "https://example.test",
    publishableKey: "public-test-key",
    secretKey: "server-test-key"
  });
  assert.throws(() => getSupabaseServerSecretConfig(clientConfig), MissingSupabaseConfigurationError);
});
