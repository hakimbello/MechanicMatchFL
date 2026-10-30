import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";

import {
  createOpaquePhotoObjectKeys,
  processProviderPhoto,
  PROVIDER_PHOTO_LIMITS,
  ProviderPhotoValidationError
} from "../src/photos/photoProcessing.ts";
import { persistPhotoUpload, PhotoFinalizationStateUnknownError, type PhotoObjectStore, type PhotoRecordStore } from "../src/photos/photoUploadTransaction.ts";
import type { ProcessedProviderPhoto } from "../src/photos/photoTypes.ts";

const migration = readFileSync("supabase/migrations/202610300001_add_m14_provider_photos.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/202610300001_add_m14_provider_photos.down.sql", "utf8");
const runbook = readFileSync("docs/m14-provider-photo-operations.md", "utf8");

function functionDefinition(name: string) {
  return migration.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`, "i"))?.[0] ?? "";
}

async function validInput() {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 32, g: 120, b: 180 } }
  }).jpeg().withMetadata({ orientation: 1 }).toBuffer();
}

test("real JPEG bytes are decoded and normalized to metadata-free WebP", async () => {
  const input = await validInput();
  const result = await processProviderPhoto(input);
  assert.equal(result.originalMediaType, "image/jpeg");
  assert.equal(result.originalExtension, "jpg");
  assert.equal(result.width, 800);
  assert.equal(result.height, 600);
  assert.match(result.digest, /^[0-9a-f]{64}$/);
  const output = await sharp(result.normalizedBytes).metadata();
  assert.equal(output.format, "webp");
  assert.equal(output.exif, undefined);
  assert.equal(output.icc, undefined);
  assert.equal(output.xmp, undefined);
});

test("declared MIME and filename are irrelevant to actual-content validation", async () => {
  const result = await processProviderPhoto(await validInput());
  assert.equal(result.originalMediaType, "image/jpeg");
  await assert.rejects(() => processProviderPhoto(Buffer.from("<svg><script>alert(1)</script></svg>")), ProviderPhotoValidationError);
  await assert.rejects(() => processProviderPhoto(Buffer.from("<html>not an image</html>")), ProviderPhotoValidationError);
});

test("polyglot suffixes and metadata are removed instead of being published", async () => {
  const payload = Buffer.concat([await validInput(), Buffer.from("<script>unsafe()</script>")]);
  const result = await processProviderPhoto(payload);
  assert.equal(Buffer.from(result.normalizedBytes).includes(Buffer.from("<script>")), false);
  assert.notDeepEqual(result.normalizedBytes, payload);
});

test("oversized byte payloads and decompression-bomb dimensions fail closed", async () => {
  await assert.rejects(
    () => processProviderPhoto(new Uint8Array(PROVIDER_PHOTO_LIMITS.maxInputBytes + 1)),
    /no larger than 4 MB/
  );
  const compressedLargeImage = await sharp({
    create: { width: 5001, height: 5001, channels: 3, background: "white" }
  }).png().toBuffer();
  await assert.rejects(() => processProviderPhoto(compressedLargeImage), /safely decoded|6000x6000/);
});

test("animated and unsupported image formats are rejected", async () => {
  const gif = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "red" }
  }).gif().toBuffer();
  await assert.rejects(() => processProviderPhoto(gif), /JPEG, PNG, or WebP/);
});

test("opaque object keys never derive from provider IDs or browser filenames", () => {
  const first = createOpaquePhotoObjectKeys("png");
  const second = createOpaquePhotoObjectKeys("png");
  assert.match(first.originalObjectKey, /^original\/[0-9a-f-]{36}\.png$/);
  assert.match(first.normalizedObjectKey, /^normalized\/[0-9a-f-]{36}\.webp$/);
  assert.notEqual(first.originalObjectKey, second.originalObjectKey);
  assert.doesNotMatch(first.originalObjectKey, /provider|photo\.png/i);
});

const processed: ProcessedProviderPhoto = {
  originalBytes: new Uint8Array([1, 2]),
  normalizedBytes: new Uint8Array([3, 4]),
  originalMediaType: "image/png",
  originalExtension: "png",
  width: 640,
  height: 480,
  digest: "a".repeat(64)
};

function uploadInput() {
  return {
    providerId: "provider",
    originalObjectKey: "original/00000000-0000-4000-8000-000000000000.png",
    normalizedObjectKey: "normalized/00000000-0000-4000-8000-000000000000.webp",
    consentAttested: true as const,
    photo: processed
  };
}

test("partial storage upload failure cleans up the completed original", async () => {
  const uploaded: string[] = [];
  const removed: string[][] = [];
  const objects: PhotoObjectStore = {
    async upload(key) {
      if (key.startsWith("normalized/")) throw new Error("storage failure");
      uploaded.push(key);
    },
    async remove(keys) { removed.push(keys); }
  };
  const records: PhotoRecordStore = { async create() { assert.fail("database must not be called"); } };
  await assert.rejects(() => persistPhotoUpload(uploadInput(), objects, records), /storage failure/);
  assert.equal(uploaded.length, 1);
  assert.deepEqual(removed, [[uploadInput().originalObjectKey]]);
});

test("database failure removes both private objects and cleanup failure does not mask it", async () => {
  const removed: string[][] = [];
  const objects: PhotoObjectStore = {
    async upload() {},
    async remove(keys) { removed.push(keys); }
  };
  const records: PhotoRecordStore = { async create() { throw new Error("database failure"); } };
  await assert.rejects(() => persistPhotoUpload(uploadInput(), objects, records), /database failure/);
  assert.deepEqual(removed, [[uploadInput().originalObjectKey, uploadInput().normalizedObjectKey]]);

  const cleanupFailure: PhotoObjectStore = {
    async upload() {},
    async remove() { throw new Error("cleanup failure"); }
  };
  await assert.rejects(() => persistPhotoUpload(uploadInput(), cleanupFailure, records), /database failure/);
});

test("ambiguous finalization preserves private objects for reconciliation", async () => {
  let removed = false;
  const objects: PhotoObjectStore = {
    async upload() {},
    async remove() { removed = true; }
  };
  const records: PhotoRecordStore = {
    async create() { throw new PhotoFinalizationStateUnknownError(); }
  };
  await assert.rejects(() => persistPhotoUpload(uploadInput(), objects, records), PhotoFinalizationStateUnknownError);
  assert.equal(removed, false);
});

test("photo submission derives auth.uid and consumes a matching private upload ticket", () => {
  const submit = functionDefinition("submit_provider_photo");
  assert.match(submit, /v_user uuid := auth\.uid\(\)/i);
  assert.doesNotMatch(submit, /p_auth_user_id|p_provider_id|p_original_object_key/i);
  assert.match(submit, /auth_user_id = v_user/i);
  assert.match(submit, /c\.provider_id = v_ticket\.provider_id/i);
  assert.match(submit, /consumed_at is null/i);
  assert.match(submit, /expires_at > now\(\)/i);
  assert.match(submit, /for update/i);
  assert.match(submit, /storage\.objects[\s\S]*v_ticket\.original_object_key/i);
  assert.match(submit, /storage\.objects[\s\S]*v_ticket\.normalized_object_key/i);
  assert.match(submit, /set consumed_at = now\(\)/i);
  assert.match(submit, /c\.status = 'approved'/i);
  assert.match(submit, /p\.status = 'active'/i);
  assert.match(submit, /provider_suspensions[\s\S]*s\.status = 'active'/i);
  assert.match(migration, /grant execute on function public\.submit_provider_photo\(uuid\) to authenticated/i);
  assert.doesNotMatch(migration, /grant execute on function public\.submit_provider_photo\(uuid\) to (anon|service_role)/i);
});

test("the browser cannot forge photo identity, provider ownership, or object paths", () => {
  const action = readFileSync("app/provider/account/actions.ts", "utf8");
  const auth = readFileSync("src/providers/providerAuth.ts", "utf8");
  const persistence = readFileSync("src/photos/supabasePhotoPersistence.ts", "utf8");
  const runtime = readFileSync("src/photos/runtimePhotoPersistence.ts", "utf8");
  assert.match(action, /getProviderAuthentication/);
  assert.match(auth, /auth\.getUser\(\)/);
  assert.doesNotMatch(action, /formData\.get\(["'](?:user|userId|authUserId|objectKey|status)/i);
  assert.match(persistence, /authenticatedClient\.auth\.getUser\(\)/);
  assert.match(persistence, /^import "server-only";/);
  assert.match(runtime, /^import "server-only";/);
  assert.match(persistence, /auth_user_id: user\.id/i);
  assert.match(persistence, /from\("provider_photo_upload_tickets"\)[\s\S]*\.insert/i);
  assert.match(persistence, /authenticatedClient!\.rpc\("submit_provider_photo"[\s\S]*p_upload_ticket_id/i);
  assert.doesNotMatch(persistence, /p_auth_user_id|p_provider_id|p_original_object_key/);
  assert.doesNotMatch(action, /SUPABASE_SECRET_KEY|createSupabasePrivilegedDataClient|service_role/i);
  assert.match(migration, /revoke all on table public\.provider_photo_upload_tickets from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, delete on table public\.provider_photo_upload_tickets to service_role/i);
  assert.match(persistence, /provider_photo_upload_tickets"[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", ticket\.id\)/i);
  assert.match(persistence, /select\("consumed_at"\)/i);
  assert.match(persistence, /ticketState\?\.consumed_at/i);
  assert.match(persistence, /PhotoFinalizationStateUnknownError/);
});

test("storage paths are server-generated, constrained, private, and absent from public projections", () => {
  assert.match(migration, /provider-photos-private[\s\S]*false[\s\S]*4194304/i);
  assert.match(migration, /as restrictive for all to anon, authenticated/i);
  assert.match(migration, /bucket_id <> 'provider-photos-private'/i);
  assert.match(migration, /original_object_key ~ '\^original\//i);
  assert.match(migration, /normalized_object_key ~ '\^normalized\//i);
  const view = migration.match(/create or replace view public\.approved_public_provider_photos[\s\S]*?;\s*\n\s*revoke/i)?.[0] ?? "";
  assert.match(view, /ph\.status = 'approved'/i);
  assert.match(view, /p\.status = 'active'/i);
  assert.match(view, /provider_claims c[\s\S]*c\.status = 'approved'/i);
  assert.match(view, /provider_suspensions/i);
  const publicColumns = view.match(/select[\s\S]*?from public\.provider_photos/i)?.[0] ?? "";
  assert.doesNotMatch(publicColumns, /object_key|submitted_by|claim_id|moderation_reason|content_sha256/i);
});

test("one pending and one approved photo are enforced while replacement approval is audited", () => {
  assert.match(migration, /provider_photos_one_pending_idx[\s\S]*where status = 'pending'/i);
  assert.match(migration, /provider_photos_one_approved_idx[\s\S]*where status = 'approved'/i);
  const moderate = functionDefinition("admin_moderate_provider_photo");
  assert.match(moderate, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(moderate, /where id = p_photo_id and status = 'pending' for update/i);
  assert.match(moderate, /c\.id = v_photo\.claim_id[\s\S]*c\.status = 'approved'[\s\S]*p\.status = 'active'/i);
  assert.match(moderate, /for update of c/i);
  assert.match(moderate, /provider_suspensions[\s\S]*s\.status = 'active'/i);
  assert.match(moderate, /status = 'removed'[\s\S]*Replaced by a newly approved provider photo/i);
  assert.match(moderate, /provider_photo_history/g);
  assert.match(moderate, /for update/i);
  assert.doesNotMatch(moderate, /delete from|storage\.objects/i);
});

test("rejection and safety removal keep private evidence and require an authorized moderator", () => {
  const moderate = functionDefinition("admin_moderate_provider_photo");
  const remove = functionDefinition("admin_remove_provider_photo");
  assert.match(moderate, /status = 'rejected'/i);
  assert.match(remove, /public\.is_mechanicmatch_admin\(\)/i);
  assert.match(remove, /status = 'removed'/i);
  assert.match(remove, /provider_photo_history/i);
  assert.doesNotMatch(moderate + remove, /delete from public\.provider_photos|storage\.objects/i);
});

test("simultaneous moderation decisions serialize and only a pending row can win", () => {
  const moderate = functionDefinition("admin_moderate_provider_photo");
  const remove = functionDefinition("admin_remove_provider_photo");
  assert.match(moderate, /where id = p_photo_id and status = 'pending' for update/i);
  assert.match(moderate, /where provider_id = v_photo\.provider_id for update/i);
  assert.match(remove, /where id = p_photo_id and status = 'approved'/i);
  assert.match(migration, /provider_photos_one_approved_idx[\s\S]*where status = 'approved'/i);
  assert.match(moderate, /exception when unique_violation then return false/i);
});

test("M14 functions use empty search paths and least-privilege grants", () => {
  for (const name of ["submit_provider_photo", "admin_moderate_provider_photo", "admin_remove_provider_photo"]) {
    assert.match(functionDefinition(name), /security definer set search_path = ''/i, name);
    assert.match(migration, new RegExp(`revoke execute on function public\\.${name}`, "i"), name);
  }
  assert.match(migration, /grant execute on function public\.admin_moderate_provider_photo\([^;]+\) to authenticated/i);
  assert.match(migration, /grant execute on function public\.admin_remove_provider_photo\([^;]+\) to authenticated/i);
});

test("M14 does not replace M11-M13 public views and rollback is evidence-guarded", () => {
  assert.doesNotMatch(migration, /create or replace view public\.(active_public_providers|approved_public_reviews|approved_public_provider_responses)/i);
  assert.match(rollback, /Cannot roll back M14 while provider photo records or moderation history exist/i);
  assert.match(rollback, /Cannot roll back M14 while private provider photo objects exist/i);
  assert.match(rollback, /Cannot roll back M14 while provider photo upload tickets exist/i);
  assert.ok(rollback.indexOf("drop function") < rollback.indexOf("drop table"));
  assert.doesNotMatch(rollback, /cascade/i);
});

test("application delivery never exposes signed URLs or private object keys", () => {
  const route = readFileSync("app/provider-photos/[providerId]/route.ts", "utf8");
  const adminRoute = readFileSync("app/admin/provider-photos/[photoId]/route.ts", "utf8");
  const profile = readFileSync("app/mechanics/[providerId]/page.tsx", "utf8");
  const providerActions = readFileSync("app/provider/account/actions.ts", "utf8");
  assert.match(route, /downloadPublicPhoto/);
  assert.match(route, /Content-Type": "image\/webp"/);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.match(adminRoute, /getAdminAuthorization/);
  assert.match(adminRoute, /downloadAdminPhoto/);
  assert.match(adminRoute, /Cache-Control": "private, no-store"/);
  assert.doesNotMatch(route + adminRoute + profile + providerActions, /createSignedUrl|getPublicUrl|original_object_key|normalized_object_key|SUPABASE_SECRET_KEY/i);
  assert.match(profile, /\/provider-photos\//);
});

test("public downloads recheck approved, claimed, active, and non-suspended eligibility", () => {
  const persistence = readFileSync("src/photos/supabasePhotoPersistence.ts", "utf8");
  const view = migration.match(/create or replace view public\.approved_public_provider_photos[\s\S]*?;\s*\n\s*revoke/i)?.[0] ?? "";
  assert.match(persistence, /downloadPublicPhoto[\s\S]*getPublicPhoto\(providerId\)/i);
  assert.match(persistence, /downloadPhotoObject\(photo\.id, true\)/i);
  assert.match(persistence, /const confirmed = await this\.getPublicPhoto\(providerId\)/i);
  assert.match(persistence, /confirmed\?\.id === photo\.id \? object : null/i);
  assert.match(persistence, /if \(requireApproved\) query = query\.eq\("status", "approved"\)/i);
  assert.match(view, /ph\.status = 'approved'/i);
  assert.match(view, /c\.status = 'approved'/i);
  assert.match(view, /p\.status = 'active'/i);
  assert.match(view, /not exists[\s\S]*provider_suspensions/i);
  assert.doesNotMatch(view, /rejected|removed/);
});

test("operations documentation covers private originals, cleanup, retention, and guarded rollback", () => {
  assert.match(runbook, /Original and normalized objects[\s\S]*private bucket/i);
  assert.match(runbook, /retained for 30 days/i);
  assert.match(runbook, /orphan objects/i);
  assert.match(runbook, /auth\.getUser\(\)[\s\S]*auth\.uid\(\)/i);
  assert.match(runbook, /Rollback never silently deletes photo evidence/i);
  assert.match(runbook, /No live migration or bucket creation/i);
});
