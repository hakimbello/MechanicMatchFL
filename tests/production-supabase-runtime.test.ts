import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { transitionProviderAsAdmin } from "../src/admin/adminLifecycleService.ts";
import type { Provider, ProviderStatus } from "../src/domain/providers.ts";
import { InMemoryProviderPersistence, ProviderPersistenceError, type ProviderAdminIdentity, type ProviderPersistence } from "../src/providers/providerPersistence.ts";
import { submitProviderSubmission } from "../src/submissions/providerSubmissionService.ts";
import { transitionProviderSubmission } from "../src/submissions/lifecycle.ts";
import { EMPTY_PROVIDER_SUBMISSION, type ProviderSubmissionInput, type ProviderSubmissionRecord } from "../src/submissions/submissionTypes.ts";
import { createSubmittedProviderRecord, validateProviderSubmission } from "../src/submissions/validation.ts";

const validSubmission: ProviderSubmissionInput = {
  ...EMPTY_PROVIDER_SUBMISSION,
  businessName: "Server Boundary Auto",
  phone: "(305) 555-0707",
  email: "owner@serverboundary.test",
  providerType: "independent-auto-repair-shop",
  locationKind: "physical",
  street: "100 Server Ave",
  city: "Miami",
  county: "Miami-Dade",
  zip: "33130",
  services: ["general-repair", "brakes"],
  allMakes: false,
  makesServiced: "Honda, Toyota",
  description: "Fictional provider for Phase 1B server boundary tests.",
  registrationNumber: "MV-SERVER-1",
  authorizationRelationship: "my-business",
  authorizationAttested: true
};

const admin: ProviderAdminIdentity = { userId: "00000000-0000-0000-0000-000000000001" };

function submittedRecord(id = "submission-server-boundary"): ProviderSubmissionRecord {
  const result = createSubmittedProviderRecord(validSubmission, new Date("2026-09-16T12:00:00.000Z"), id);
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid submission");
  }
  return result.record;
}

function move(record: ProviderSubmissionRecord, statuses: ProviderStatus[]): ProviderSubmissionRecord {
  return statuses.reduce((current, status) => transitionProviderSubmission(current, status), record);
}

class FakeProviderPersistence implements ProviderPersistence {
  readonly transitionCalls: Array<{ id: string; status: ProviderStatus; admin: ProviderAdminIdentity }> = [];
  createdRecord: ProviderSubmissionRecord | null = null;
  private readonly records: ProviderSubmissionRecord[];
  private readonly options: { createFails?: boolean; transitionFails?: boolean };

  constructor(
    records: ProviderSubmissionRecord[] = [],
    options: { createFails?: boolean; transitionFails?: boolean } = {}
  ) {
    this.records = records;
    this.options = options;
  }

  async createProviderSubmission(record: ProviderSubmissionRecord): Promise<ProviderSubmissionRecord> {
    if (this.options.createFails) {
      throw new ProviderPersistenceError();
    }

    this.createdRecord = record;
    this.records.unshift(record);
    return record;
  }

  async listProviderSubmissionsForAdmin(): Promise<ProviderSubmissionRecord[]> {
    return [...this.records];
  }

  async getProviderSubmissionForAdmin(id: string): Promise<ProviderSubmissionRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async transitionProviderStatus(
    id: string,
    status: ProviderStatus,
    adminIdentity: ProviderAdminIdentity
  ): Promise<ProviderSubmissionRecord> {
    this.transitionCalls.push({ id, status, admin: adminIdentity });
    if (this.options.transitionFails) {
      throw new ProviderPersistenceError();
    }

    const current = await this.getProviderSubmissionForAdmin(id);
    if (!current) {
      throw new ProviderPersistenceError();
    }

    return { ...current, status };
  }

  async listActivePublicProviders(): Promise<Provider[]> {
    return [];
  }

  async getActivePublicProviderById(_id: string): Promise<Provider | null> {
    return null;
  }
}

test("server submission service forces new records to submitted", async () => {
  const persistence = new FakeProviderPersistence();
  const maliciousInput = {
    ...validSubmission,
    status: "active",
    registration: { value: "trusted", verificationStatus: "verified" }
  } as ProviderSubmissionInput & Record<string, unknown>;

  const result = await submitProviderSubmission(maliciousInput, persistence, new Date("2026-09-16T12:00:00.000Z"));

  assert.equal(result.ok, true);
  assert.ok(persistence.createdRecord);
  assert.equal(persistence.createdRecord.status, "submitted");
  assert.equal(persistence.createdRecord.registration?.verificationStatus, "submitted-unverified");
  assert.equal(persistence.createdRecord.authorizationAttested, true);
});

test("server submission service returns a safe form error when persistence fails", async () => {
  const result = await submitProviderSubmission(validSubmission, new FakeProviderPersistence([], { createFails: true }));

  assert.deepEqual(result, {
    ok: false,
    formError: "Provider submission is temporarily unavailable. Please try again later."
  });
});

test("submission validation caps long free-text input before database writes", () => {
  const errors = validateProviderSubmission({
    ...validSubmission,
    businessName: "A".repeat(121),
    email: `${"a".repeat(245)}@example.test`,
    makesServiced: "Honda, ".repeat(60),
    street: "1".repeat(161),
    city: "M".repeat(81)
  });

  assert.equal(errors.businessName, "Keep the provider or business name under 120 characters.");
  assert.equal(errors.email, "Keep the email address under 254 characters.");
  assert.equal(errors.makesServiced, "Keep makes serviced under 300 characters.");
  assert.equal(errors.street, "Keep the shop street address under 160 characters.");
  assert.equal(errors.city, "Keep the shop city under 80 characters.");
});

test("active public provider reads exclude submitted and approved-only submissions", async () => {
  const submitted = submittedRecord("submitted-only");
  const approved = move(submittedRecord("approved-only"), ["under-review", "approved"]);
  const active = move(submittedRecord("active-only"), ["under-review", "approved", "active"]);
  const persistence = new InMemoryProviderPersistence([submitted, approved, active]);

  const providers = await persistence.listActivePublicProviders();

  assert.deepEqual(providers.map((provider) => provider.id), ["active-only"]);
  assert.equal(await persistence.getActivePublicProviderById("submitted-only"), null);
  assert.equal((await persistence.getActivePublicProviderById("active-only"))?.status, "active");
});

test("admin lifecycle service refuses invalid transitions before mutating persistence", async () => {
  const persistence = new FakeProviderPersistence([submittedRecord()]);

  const result = await transitionProviderAsAdmin("submission-server-boundary", "active", admin, persistence);

  assert.deepEqual(result, { ok: false, reason: "invalid-transition" });
  assert.equal(persistence.transitionCalls.length, 0);
});

test("admin lifecycle service forwards authorized admin identity to persistence", async () => {
  const record = move(submittedRecord(), ["under-review"]);
  const persistence = new FakeProviderPersistence([record]);

  const result = await transitionProviderAsAdmin(record.id, "approved", admin, persistence);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(persistence.transitionCalls, [{ id: record.id, status: "approved", admin }]);
});

test("Phase 1B client and server wiring keeps secrets server-only", () => {
  const browserClient = readFileSync("src/supabase/browserClient.ts", "utf8");
  const serverClient = readFileSync("src/supabase/serverClient.ts", "utf8");
  const submissionForm = readFileSync("app/list-your-business/provider-submission-form.tsx", "utf8");
  const submissionAction = readFileSync("app/list-your-business/actions.ts", "utf8");

  assert.match(browserClient, /createBrowserClient/);
  assert.equal(browserClient.includes("SUPABASE_SECRET_KEY"), false);
  assert.match(serverClient, /createSupabasePrivilegedDataClient/);
  assert.match(serverClient, /getSupabaseServerSecretConfig/);
  assert.match(submissionForm, /submitProviderAction/);
  assert.equal(submissionForm.includes("localStorage"), false);
  assert.equal(submissionForm.includes("BrowserProviderSubmissionRepository"), false);
  assert.match(submissionAction, /getProviderPersistenceForRuntime/);
});

test("admin login uses Supabase password auth without exposing public signup", () => {
  const loginForm = readFileSync("app/admin/login/admin-login-form.tsx", "utf8");
  const loginPage = readFileSync("app/admin/login/page.tsx", "utf8");

  assert.match(loginForm, /signInWithPassword/);
  assert.equal(loginForm.includes("signUp"), false);
  assert.match(loginForm, /completeAdminLoginAction/);
  assert.match(loginPage, /getAdminAuthorization/);
  assert.match(loginPage, /redirect\(nextPath\)/);
});

test("admin provider mutations require server-side authorization", () => {
  const adminPage = readFileSync("app/admin/providers/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/providers/actions.ts", "utf8");

  assert.match(adminPage, /getAdminAuthorization/);
  assert.match(adminPage, /redirect\("\/admin\/login\?next=\/admin\/providers"\)/);
  assert.match(adminActions, /getAdminAuthorization/);
  assert.match(adminActions, /transitionProviderAsAdmin/);
  assert.equal(adminActions.includes("getDevelopmentAdminAccess"), false);
});

test("public sitemap and profile routes read runtime active provider data", () => {
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  const profilePage = readFileSync("app/mechanics/[providerId]/page.tsx", "utf8");
  const proxy = readFileSync("proxy.ts", "utf8");

  assert.match(sitemap, /listRuntimePublicProviders/);
  assert.match(profilePage, /getRuntimePublicProviderById/);
  assert.match(profilePage, /listRuntimePublicProviderIds/);
  assert.match(proxy, /updateSupabaseSession/);
});
