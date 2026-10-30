# M14 provider photo operations

## Deployment prerequisites

1. Apply M11, M12, and M13 before the M14 migration.
2. Review the migration with a database owner that can create a private Supabase Storage bucket and restrictive policies on `storage.objects`.
3. Confirm the bucket name `provider-photos-private` is unused. The migration intentionally stops instead of adopting an unknown bucket.
4. Apply `202610300001_add_m14_provider_photos.sql` in a controlled maintenance window.
5. Verify the bucket is private, limited to 4 MB objects, and allows only JPEG, PNG, and WebP MIME types.
6. Verify anonymous and authenticated clients cannot list, read, insert, update, or delete objects in this bucket. Application storage access must use the server-only Supabase secret.
7. Do not expose the bucket through a public URL transform or add permissive Storage policies.

No live migration or bucket creation is part of the code milestone.

## Processing and delivery

- The server ignores the browser filename and MIME declaration.
- Input is capped at 4 MB and decoded with a 25-megapixel / 6000-pixel-dimension ceiling.
- Only single-frame JPEG, PNG, and WebP inputs are accepted.
- A new WebP, no larger than 1600 by 1200, is encoded without source metadata. Public delivery never serves the original bytes.
- Original and normalized objects use generated UUID keys and remain in the private bucket.
- The public route accepts a provider ID, resolves an approved photo through the active/non-suspended public projection, then streams the normalized object. It never returns an object key or signed URL.

## Moderation and retention

- One pending and one approved photo may exist per provider. A pending replacement does not hide the approved photo.
- Approval atomically removes the prior approved row from public eligibility and publishes the replacement.
- Rejection and safety takedown retain the database row, object keys, and history; they do not delete evidence.
- Originals should be retained for 30 days after a final moderation decision unless an investigation or legal hold requires longer retention. Only an authorized cleanup job using the service role may delete retained objects.
- A scheduled reconciliation should compare bucket objects with `provider_photos`. Opaque orphan objects can result if both database persistence and best-effort upload cleanup fail. Investigate before deleting any orphan.
- Moderators should inspect only the normalized WebP. Original uploads are retained evidence and must not be rendered in an administrator browser.

## Failure recovery

- If either object upload fails, any successfully uploaded object is removed best-effort and no database row is created.
- If database creation fails after uploads, both objects are removed best-effort.
- Moderation changes database visibility only; it does not move or rewrite objects, so a storage outage cannot partially publish a replacement.
- A missing approved normalized object produces a public 404. Reconcile storage and database state; do not approve another photo solely to conceal the failure.

## Rollback

The rollback refuses to run while photo rows, moderation history, or bucket objects exist. Before rollback:

1. Disable photo submission and moderation.
2. Export photo records and history to an approved secure location.
3. Resolve active investigations and retention holds.
4. Explicitly remove Storage objects through an audited service-role operation.
5. Remove database photo records only with owner approval.
6. Run the guarded rollback and verify the bucket, policies, view, functions, tables, and enum are removed.

Rollback never silently deletes photo evidence.
