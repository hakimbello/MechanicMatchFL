import assert from "node:assert/strict";
import test from "node:test";

import type { ProviderStatus } from "../src/domain/providers.ts";
import { getDevelopmentAdminAccess } from "../src/submissions/adminAccess.ts";
import { buildAdminReviewView } from "../src/submissions/adminReview.ts";
import { canTransitionProviderStatus, transitionProviderSubmission } from "../src/submissions/lifecycle.ts";
import { convertSubmissionToProvider, isPublicProvider } from "../src/submissions/publication.ts";
import { InMemoryProviderSubmissionRepository } from "../src/submissions/repository.ts";
import type { ProviderSubmissionInput, ProviderSubmissionRecord } from "../src/submissions/submissionTypes.ts";
import {
  EMPTY_PROVIDER_SUBMISSION,
} from "../src/submissions/submissionTypes.ts";
import { createSubmittedProviderRecord, validateProviderSubmission } from "../src/submissions/validation.ts";

const validPhysicalSubmission: ProviderSubmissionInput = {
  ...EMPTY_PROVIDER_SUBMISSION,
  businessName: "Palm Vista Auto",
  phone: "(305) 555-0101",
  email: "owner@palmvista.test",
  providerType: "independent-auto-repair-shop",
  locationKind: "physical",
  street: "100 SW 8th St",
  city: "Miami",
  county: "Miami-Dade",
  zip: "33130",
  services: ["general-repair", "brakes"],
  allMakes: false,
  makesServiced: "Honda, Toyota",
  description: "Fictional independent shop for M5 provider submission testing.",
  registrationNumber: "MV-123456",
  authorizationRelationship: "my-business",
  authorizationAttested: true
};

const validMobileSubmission: ProviderSubmissionInput = {
  ...EMPTY_PROVIDER_SUBMISSION,
  businessName: "Rolling Coast Mobile",
  phone: "954-555-0202",
  email: "dispatch@rollingcoast.test",
  providerType: "mobile-mechanic",
  locationKind: "mobile",
  serviceZipCodes: "33161, 33311",
  serviceCounties: ["Broward"],
  services: ["ac", "maintenance"],
  allMakes: true,
  description: "Fictional mobile mechanic for M5 provider submission testing.",
  authorizationRelationship: "myself",
  authorizationAttested: true
};

function submittedRecord(input: ProviderSubmissionInput = validPhysicalSubmission): ProviderSubmissionRecord {
  const result = createSubmittedProviderRecord(input, new Date("2026-09-15T12:00:00.000Z"), "submission-test");
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid submission");
  }
  return result.record;
}

function move(record: ProviderSubmissionRecord, statuses: ProviderStatus[]): ProviderSubmissionRecord {
  return statuses.reduce((current, status) => transitionProviderSubmission(current, status), record);
}

test("accepts a valid physical provider submission", () => {
  const result = createSubmittedProviderRecord(validPhysicalSubmission, new Date("2026-09-15T12:00:00.000Z"));

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.record.status, "submitted");
    assert.equal(result.record.businessName, "Palm Vista Auto");
    assert.equal(result.record.locationKind, "physical");
    assert.deepEqual(result.record.makesServiced, ["Honda", "Toyota"]);
  }
});

test("rejects missing required submission information", () => {
  const errors = validateProviderSubmission(EMPTY_PROVIDER_SUBMISSION);

  assert.equal(errors.businessName, "Enter the provider or business name.");
  assert.equal(errors.phone, "Enter a valid 10-digit phone number.");
  assert.equal(errors.email, "Enter a valid email address.");
  assert.equal(errors.providerType, "Choose a provider type.");
});

test("rejects invalid phone and email", () => {
  const errors = validateProviderSubmission({
    ...validPhysicalSubmission,
    phone: "123",
    email: "not-email"
  });

  assert.equal(errors.phone, "Enter a valid 10-digit phone number.");
  assert.equal(errors.email, "Enter a valid email address.");
});

test("rejects submissions with no selected service", () => {
  const errors = validateProviderSubmission({ ...validPhysicalSubmission, services: [] });

  assert.equal(errors.services, "Choose at least one service.");
});

test("requires vehicle compatibility", () => {
  const errors = validateProviderSubmission({ ...validPhysicalSubmission, allMakes: false, makesServiced: "" });

  assert.equal(errors.makesServiced, "Choose all makes or enter the makes you service.");
});

test("physical shops require physical location fields", () => {
  const errors = validateProviderSubmission({
    ...validPhysicalSubmission,
    street: "",
    city: "",
    county: "",
    zip: "abc"
  });

  assert.equal(errors.street, "Enter the shop street address.");
  assert.equal(errors.city, "Enter the shop city.");
  assert.equal(errors.county, "Choose Miami-Dade or Broward.");
  assert.equal(errors.zip, "Enter a valid 5-digit ZIP code.");
});

test("mobile mechanics require service area information", () => {
  const errors = validateProviderSubmission({
    ...validMobileSubmission,
    serviceZipCodes: "",
    serviceCounties: []
  });

  assert.equal(errors.serviceZipCodes, "Enter service ZIP codes or choose a service county.");
});

test("authorization relationship is required", () => {
  const errors = validateProviderSubmission({ ...validPhysicalSubmission, authorizationRelationship: "" });

  assert.equal(errors.authorizationRelationship, "Choose your relationship to the business.");
});

test("authorization attestation is required", () => {
  const errors = validateProviderSubmission({ ...validPhysicalSubmission, authorizationAttested: false });

  assert.equal(errors.authorizationAttested, "Confirm that you are authorized to create or manage this profile.");
});

test("allows valid Draft to Submitted transition", () => {
  const draft = { ...submittedRecord(), status: "draft" as const };

  assert.equal(transitionProviderSubmission(draft, "submitted").status, "submitted");
});

test("allows Submitted to Under Review transition", () => {
  assert.equal(transitionProviderSubmission(submittedRecord(), "under-review").status, "under-review");
});

test("allows Under Review to Approved transition", () => {
  const underReview = move(submittedRecord(), ["under-review"]);

  assert.equal(transitionProviderSubmission(underReview, "approved").status, "approved");
});

test("allows Approved to Active transition", () => {
  const approved = move(submittedRecord(), ["under-review", "approved"]);

  assert.equal(transitionProviderSubmission(approved, "active").status, "active");
});

test("allows Under Review to Changes Requested transition", () => {
  const underReview = move(submittedRecord(), ["under-review"]);

  assert.equal(transitionProviderSubmission(underReview, "changes-requested").status, "changes-requested");
});

test("allows Under Review to Rejected transition", () => {
  const underReview = move(submittedRecord(), ["under-review"]);

  assert.equal(transitionProviderSubmission(underReview, "rejected").status, "rejected");
});

test("allows Active to Deactivated transition", () => {
  const active = move(submittedRecord(), ["under-review", "approved", "active"]);

  assert.equal(transitionProviderSubmission(active, "deactivated").status, "deactivated");
});

test("rejects invalid lifecycle transitions", () => {
  assert.equal(canTransitionProviderStatus("submitted", "active"), false);
  assert.throws(() => transitionProviderSubmission(submittedRecord(), "active"), /cannot move/);
});

test("submitted provider is excluded from public search/provider conversion", () => {
  assert.equal(convertSubmissionToProvider(submittedRecord()), null);
});

test("under-review provider is excluded from public search/provider conversion", () => {
  assert.equal(convertSubmissionToProvider(move(submittedRecord(), ["under-review"])), null);
});

test("rejected provider is excluded from public search/provider conversion", () => {
  assert.equal(convertSubmissionToProvider(move(submittedRecord(), ["under-review", "rejected"])), null);
});

test("deactivated provider is excluded from public search/profile behavior", () => {
  assert.equal(convertSubmissionToProvider(move(submittedRecord(), ["under-review", "approved", "active", "deactivated"])), null);
});

test("active approved provider remains publicly eligible", () => {
  const provider = convertSubmissionToProvider(move(submittedRecord(), ["under-review", "approved", "active"]));

  assert.ok(provider);
  assert.equal(provider.status, "active");
  assert.equal(isPublicProvider(provider), true);
});

test("admin review representation exposes required submitted data", () => {
  const view = buildAdminReviewView(submittedRecord());

  assert.equal(view.businessName, "Palm Vista Auto");
  assert.equal(view.contact, "3055550101 / owner@palmvista.test");
  assert.equal(view.authorization, "Authorized attestation received");
  assert.equal(view.publicEligibility, "not-public");
});

test("user-entered registration remains submitted and unverified", () => {
  const record = submittedRecord();

  assert.deepEqual(record.registration, {
    value: "MV-123456",
    verificationStatus: "submitted-unverified"
  });
});

test("temporary admin authorization boundary is clearly development-only", () => {
  const access = getDevelopmentAdminAccess();

  assert.equal(access.allowed, true);
  assert.equal(access.mode, "development-only");
  assert.match(access.message, /production admin access control is not implemented/);
});

test("repository can save and transition submitted records", () => {
  const repository = new InMemoryProviderSubmissionRepository();
  const record = submittedRecord(validMobileSubmission);

  repository.save(record);
  assert.equal(repository.list().length, 1);
  assert.equal(repository.updateStatus(record.id, "under-review").status, "under-review");
});
