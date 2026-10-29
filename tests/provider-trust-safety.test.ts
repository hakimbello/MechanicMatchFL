import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateClaimEvidence, validatePrivateReason, validateProviderResponse, validateSafetyIncident } from "../src/trust/trustValidation.ts";

const migration = readFileSync("supabase/migrations/202610290003_add_m13_provider_trust_safety.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/202610290003_add_m13_provider_trust_safety.down.sql", "utf8");
const m11Migration = readFileSync("supabase/migrations/202610290001_add_m11_geography_profile_fields.sql", "utf8");
const m12Migration = readFileSync("supabase/migrations/202610290002_add_m12_verified_customer_reviews.sql", "utf8");

const ACTIVE_PROVIDER_COLUMNS = [
  "id", "name", "provider_type", "status", "location_kind", "phone", "email", "website", "services", "all_makes",
  "makes_serviced", "specialty_makes", "street", "city", "county", "zip", "latitude", "longitude",
  "service_zip_codes", "service_counties", "service_base_zip", "service_radius_miles", "service_base_latitude",
  "service_base_longitude", "description", "claimed_profile", "verified", "verified_at", "years_experience", "spoken_languages"
];
const APPROVED_REVIEW_COLUMNS = ["id", "provider_id", "rating", "review_text", "reviewer_name", "email_verified", "published_at"];

function functionDefinition(name: string) {
  return migration.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
}

function viewColumns(sql: string, name: string): string[] {
  const definition = sql.match(new RegExp(`create or replace view public\\.${name}[\\s\\S]*?;`, "i"))?.[0] ?? "";
  const selectStart = definition.search(/\bas\s+select\s+/i);
  assert.notEqual(selectStart, -1, `${name} select list`);
  const selectKeyword = definition.slice(selectStart).match(/\bas\s+select\s+/i)![0];
  const body = definition.slice(selectStart + selectKeyword.length);
  let depth = 0;
  let quoted = false;
  let fromIndex = -1;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "'" && body[index - 1] !== "\\") quoted = !quoted;
    if (quoted) continue;
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth === 0 && /^from\b/i.test(body.slice(index))) { fromIndex = index; break; }
  }
  assert.notEqual(fromIndex, -1, `${name} FROM clause`);
  const expressions: string[] = [];
  let start = 0;
  depth = 0;
  quoted = false;
  const list = body.slice(0, fromIndex);
  for (let index = 0; index <= list.length; index += 1) {
    const char = list[index];
    if (char === "'" && list[index - 1] !== "\\") quoted = !quoted;
    if (!quoted && char === "(") depth += 1;
    if (!quoted && char === ")") depth -= 1;
    if (index === list.length || (!quoted && depth === 0 && char === ",")) {
      expressions.push(list.slice(start, index).trim());
      start = index + 1;
    }
  }
  return expressions.filter(Boolean).map((expression) => {
    const alias = expression.match(/\bas\s+([a-z_][a-z0-9_]*)\s*$/i)?.[1];
    if (alias) return alias.toLowerCase();
    return expression.match(/([a-z_][a-z0-9_]*)\s*$/i)?.[1].toLowerCase() ?? "";
  });
}

test("M13 preserves the exact M11 active provider view ordinal contract", () => {
  assert.deepEqual(viewColumns(m11Migration, "active_public_providers"), ACTIVE_PROVIDER_COLUMNS);
  assert.deepEqual(viewColumns(migration, "active_public_providers"), ACTIVE_PROVIDER_COLUMNS);
  assert.deepEqual(viewColumns(rollback, "active_public_providers"), ACTIVE_PROVIDER_COLUMNS);
  assert.equal(ACTIVE_PROVIDER_COLUMNS.filter((column) => column === "claimed_profile").length, 1);
  assert.ok(ACTIVE_PROVIDER_COLUMNS.indexOf("verified_at") < ACTIVE_PROVIDER_COLUMNS.indexOf("years_experience"));
});

test("M13 preserves the exact M12 approved review view ordinal contract", () => {
  assert.deepEqual(viewColumns(m12Migration, "approved_public_reviews"), APPROVED_REVIEW_COLUMNS);
  assert.deepEqual(viewColumns(migration, "approved_public_reviews"), APPROVED_REVIEW_COLUMNS);
  assert.deepEqual(viewColumns(rollback, "approved_public_reviews"), APPROVED_REVIEW_COLUMNS);
  assert.doesNotMatch(migration, /create or replace view public\.public_provider_review_aggregates/i);
});

test("existing view grants and dependencies are preserved in place", () => {
  assert.doesNotMatch(migration, /drop view[^;]*active_public_providers/i);
  assert.doesNotMatch(migration, /drop view[^;]*approved_public_reviews/i);
  assert.doesNotMatch(migration, /revoke all on table public\.(active_public_providers|approved_public_reviews)/i);
  assert.doesNotMatch(migration, /grant select on table public\.(active_public_providers|approved_public_reviews)/i);
  assert.match(migration, /grant select on table public\.approved_public_provider_responses to anon,authenticated/i);
});

test("provider ownership evidence and private content enforce bounded validation", () => {
  assert.ok(validateClaimEvidence("short"));
  assert.equal(validateClaimEvidence("Independent ownership evidence ".repeat(2)), null);
  assert.ok(validateProviderResponse("too short"));
  assert.equal(validateProviderResponse("We appreciate the feedback and have followed up privately."), null);
  assert.ok(validatePrivateReason("too short"));
  assert.equal(validatePrivateReason("This private reason includes enough specific detail for review."), null);
});

test("safety validation supports anonymous reports while protecting abuse boundaries", () => {
  const valid = { category: "unsafe-work", description: "A specific confidential incident description with enough details for administrator review." };
  assert.deepEqual(validateSafetyIncident(valid), {});
  assert.ok(validateSafetyIncident({ ...valid, category: "public-accusation" }).category);
  assert.ok(validateSafetyIncident({ ...valid, reporterEmail: "invalid" }).reporterEmail);
  assert.ok(validateSafetyIncident({ ...valid, website: "bot" }).website);
});

test("claims bind ownership to auth.uid and never trust a client-supplied user id", () => {
  const claim = functionDefinition("submit_provider_claim");
  assert.match(claim, /v_user_id uuid := auth\.uid\(\)/i);
  assert.doesNotMatch(claim, /p_(auth_)?user_id/i);
  assert.match(claim, /status = 'active'/i);
  assert.match(migration, /provider_claims_one_approved_owner_idx[\s\S]*where status = 'approved'/i);
  assert.match(migration, /references auth\.users\(id\)/i);
  assert.match(migration, /provider_claims_one_current_request_idx/i);
  assert.match(claim, /exception when unique_violation then return false/i);
});

test("claim approval is admin-only and rejected, disabled, or revoked claims cannot act", () => {
  const review = functionDefinition("admin_review_provider_claim");
  const ownership = functionDefinition("has_approved_provider_claim");
  assert.match(review, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(review, /auth\.uid\(\)/i);
  assert.match(ownership, /c\.status = 'approved'/i);
  assert.match(ownership, /c\.auth_user_id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(ownership, /pending|rejected|disabled|revoked/i);
  const adminDefinition = readFileSync("supabase/migrations/202609160001_prepare_provider_persistence.sql", "utf8");
  assert.match(adminDefinition, /is_mechanicmatch_admin[\s\S]*disabled_at is null/i);
});

test("provider replies require ownership, an active provider, and an approved review", () => {
  const response = functionDefinition("submit_provider_review_response");
  assert.match(response, /status = 'approved' and published_at is not null/i);
  assert.match(response, /public\.has_approved_provider_claim\(v_review\.provider_id\)/i);
  assert.match(migration, /review_id uuid not null unique references public\.customer_reviews/i);
  assert.doesNotMatch(response, /p_provider_id/i);
});

test("response edits return to moderation and preserve revision audit history", () => {
  const response = functionDefinition("submit_provider_review_response");
  const moderation = functionDefinition("admin_moderate_provider_response");
  assert.match(response, /status = 'pending'[\s\S]*published_at = null/i);
  assert.match(response, /provider_review_response_history[\s\S]*'edited'/i);
  assert.match(moderation, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(moderation, /provider_review_response_history/i);
});

test("public responses are approved-only and lose visibility when ownership is revoked", () => {
  const view = migration.match(/create or replace view public\.approved_public_provider_responses[\s\S]*?status='active'\);/i)?.[0] ?? "";
  assert.match(view, /pr\.status='approved'/i);
  assert.match(view, /c\.status='approved'/i);
  assert.match(view, /r\.status='approved'/i);
  assert.doesNotMatch(view, /auth_user_id|evidence|moderation_reason|review_reason/i);
});

test("review disputes remain private and cannot alter review publication", () => {
  const dispute = functionDefinition("submit_provider_review_dispute");
  const admin = functionDefinition("admin_update_provider_dispute");
  assert.match(dispute, /has_approved_provider_claim/i);
  assert.match(admin, /provider_review_dispute_history/i);
  assert.doesNotMatch(dispute + admin, /update public\.customer_reviews/i);
  assert.doesNotMatch(migration, /grant select on table public\.provider_review_disputes to anon/i);
});

test("anonymous safety intake is rate limited transactionally and remains confidential", () => {
  const safety = functionDefinition("submit_safety_incident");
  assert.match(safety, /pg_advisory_xact_lock/i);
  assert.match(safety, />= 3/);
  assert.match(safety, />= 2/);
  assert.match(migration, /revoke all on table public\.safety_incidents from anon, authenticated/i);
  assert.doesNotMatch(migration, /grant select on table public\.safety_incidents/i);
  assert.doesNotMatch(migration, /create or replace view[\s\S]*reporter_email/i);
  assert.match(safety, /delete from public\.safety_incident_attempts where created_at < now\(\) - interval '30 days'/i);
});

test("suspension is admin-controlled, audited, and not rating-triggered", () => {
  const suspend = functionDefinition("admin_suspend_provider");
  assert.match(suspend, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(suspend, /provider_suspension_history/i);
  assert.doesNotMatch(suspend, /rating|average|review_count/i);
  assert.match(migration, /provider_suspensions_one_active_idx/i);
});

test("active suspensions exclude providers, reviews, and responses from public views", () => {
  const providerView = migration.match(/create or replace view public\.active_public_providers[\s\S]*?status='active'\);/i)?.[0] ?? "";
  const reviewView = migration.match(/create or replace view public\.approved_public_reviews[\s\S]*?status='active'\);/i)?.[0] ?? "";
  assert.match(providerView, /not exists\(select 1 from public\.provider_suspensions/i);
  assert.match(reviewView, /not exists\(select 1 from public\.provider_suspensions/i);
  assert.match(migration, /approved_public_provider_responses[\s\S]*not exists\(select 1 from public\.provider_suspensions/i);
});

test("appeals require approved ownership and an active suspension with audit history", () => {
  const appeal = functionDefinition("submit_provider_suspension_appeal");
  const decide = functionDefinition("admin_decide_provider_appeal");
  assert.match(appeal, /auth_user_id=v_user and status='approved'/i);
  assert.match(appeal, /provider_suspensions where provider_id=p_provider_id and status='active'/i);
  assert.match(appeal, /provider_suspension_appeal_history/i);
  assert.match(decide, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(decide, /admin_reinstate_provider/i);
  assert.match(decide, /raise exception 'Granted appeal could not reinstate its active suspension'/i);
});

test("all M13 security-definer functions use an empty search path", () => {
  const names = ["has_approved_provider_claim","submit_provider_claim","admin_review_provider_claim","submit_provider_review_response","admin_moderate_provider_response","submit_provider_review_dispute","admin_update_provider_dispute","submit_safety_incident","admin_update_safety_incident","admin_suspend_provider","admin_reinstate_provider","submit_provider_suspension_appeal","admin_decide_provider_appeal"];
  for (const name of names) {
    const definition = functionDefinition(name);
    assert.match(definition, /security definer/i, name);
    assert.match(definition, /set search_path = ''/i, name);
    assert.match(migration, new RegExp(`revoke execute on function public\\.${name}`, "i"), name);
  }
  assert.match(migration, /grant execute on function public\.submit_safety_incident[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute on function public\.submit_safety_incident[\s\S]*to anon/i);
});

test("M13 EXECUTE grants are limited to the required authenticated and service roles", () => {
  const authenticatedFunctions = [
    "has_approved_provider_claim", "submit_provider_claim", "submit_provider_review_response",
    "submit_provider_review_dispute", "submit_provider_suspension_appeal", "admin_review_provider_claim",
    "admin_moderate_provider_response", "admin_update_provider_dispute", "admin_update_safety_incident",
    "admin_suspend_provider", "admin_reinstate_provider", "admin_decide_provider_appeal"
  ];
  for (const name of authenticatedFunctions) {
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}\\([^;]+\\) to authenticated`, "i"), name);
    assert.doesNotMatch(migration, new RegExp(`grant execute on function public\\.${name}\\([^;]+\\) to (anon|service_role)`, "i"), name);
  }
  assert.match(migration, /grant execute on function public\.submit_safety_incident\([^;]+\) to service_role/i);
  assert.doesNotMatch(migration, /grant execute on function public\.submit_safety_incident\([^;]+\) to (anon|authenticated)/i);
});

test("M13 private tables use RLS and expose no direct authenticated writes", () => {
  for (const table of ["provider_claims","provider_review_responses","provider_review_disputes","safety_incidents","provider_suspensions","provider_suspension_appeals"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"), table);
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"), table);
    assert.doesNotMatch(migration, new RegExp(`grant (insert|update|delete) on table public\\.${table}`, "i"), table);
  }
});

test("rollback is data-guarded, restores public projections, and preserves evidence by default", () => {
  assert.match(rollback, /Cannot roll back M13 while claim, response, dispute, safety, suspension, or appeal evidence exists/i);
  assert.match(rollback, /create or replace view public\.active_public_providers/i);
  assert.match(rollback, /create or replace view public\.approved_public_reviews/i);
  assert.ok(rollback.indexOf("drop function if exists public.submit_provider_claim") < rollback.indexOf("drop table if exists public.provider_claims"));
  assert.doesNotMatch(rollback, /cascade/i);
});

test("M13 remains additive and preserves legacy provider lifecycle values", () => {
  assert.doesNotMatch(migration, /alter type public\.provider_status/i);
  assert.doesNotMatch(migration, /delete from public\.provider_records/i);
  assert.doesNotMatch(migration, /update public\.provider_records set status/i);
  assert.match(migration, /provider_id text not null references public\.provider_records\(id\)/i);
});

test("application surfaces use authenticated boundaries without embedding secrets", () => {
  const providerAuth = readFileSync("src/providers/providerAuth.ts", "utf8");
  const providerActions = readFileSync("app/provider/account/actions.ts", "utf8");
  const adminActions = readFileSync("app/admin/trust/actions.ts", "utf8");
  const safetyAction = readFileSync("app/safety/report/actions.ts", "utf8");
  assert.match(providerAuth, /auth\.getUser\(\)/);
  assert.match(providerActions, /getProviderAuthentication/);
  assert.match(adminActions, /getAdminAuthorization/);
  assert.match(safetyAction, /getReviewRateLimitIdentity/);
  assert.doesNotMatch(providerActions + adminActions + safetyAction, /SUPABASE_SECRET_KEY|console\.|service_role/i);
});
