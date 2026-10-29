# M13 Trust and Safety Operations

## Deployment order

M13 code depends on `202610290003_add_m13_provider_trust_safety.sql`. Apply the reviewed migration before deploying code that queries `approved_public_provider_responses` or the M13 private tables. Do not apply it from a browser session or with an anonymous key.

1. Export and retain a database backup.
2. Confirm M11 and M12 migrations are already present.
3. Apply M13 through the authorized Supabase migration runner.
4. Verify the private tables have RLS enabled and no direct `anon` or `authenticated` table privileges.
5. Verify provider/admin RPC grants match the migration and all functions have an empty `search_path`.
6. Test a non-production provider claim through pending, rejection, approval, disable, and revoke paths before launch.
7. Deploy application code only after the public views and RPCs are available.

Supabase Auth email confirmation should remain enabled for provider account creation. An authenticated account is not ownership: an enabled administrator must approve the provider claim before any reply, dispute, or appeal RPC succeeds.

## Suspension policy

Suspension is an administrator-controlled overlay with a private reason and immutable history. No rating threshold, individual negative review, dispute, or safety report automatically suspends a provider. While a suspension is active, the provider, its reviews, and its approved responses are excluded from public views. Granting an appeal records the appeal decision and an attributed reinstatement event.

## Privacy

Claim evidence, Auth user IDs, disputes, appeals, reporter contact information, abuse hashes, investigation notes, administrator IDs, and suspension reasons remain in private tables. Public views expose only active non-suspended provider data, approved reviews, and approved current provider responses.

## Rollback

The rollback is intentionally blocked when any M13 evidence exists. Exporting data is not enough by itself: deletion and rollback require a separate, explicitly approved data migration. The rollback restores the M11/M12 public projections, removes the M13 response view, then removes functions before tables. It never uses `CASCADE`.
