# Supabase Production Setup

Production Infrastructure Phase 1A prepares MechanicMatchFL for Supabase-backed provider persistence and production admin authorization. It does not connect live credentials, mutate the live Supabase database, deploy the app, or mark the product production-ready.

## Architecture

MechanicMatchFL keeps the existing locked MVP shape:

- Public provider submission remains accountless for V1.
- Public form submission should flow through a Next.js server boundary before any database write.
- Supabase PostgreSQL stores durable provider records.
- Supabase Auth establishes administrator identity.
- A private database allow-list authorizes which authenticated Supabase users are MechanicMatchFL admins.
- Public search/profile data is served from an explicit active-provider projection, not the private base table.

Phase 1A adds the schema, environment contract, TypeScript persistence boundary, and mappers. It deliberately does not wire live Supabase clients or credentials.

## Schema

Migration:

`supabase/migrations/202609160001_prepare_provider_persistence.sql`

The migration creates:

- `public.admin_users`: private allow-list keyed by immutable Supabase Auth `auth.users.id`.
- `public.provider_records`: durable provider submission and lifecycle records.
- `public.active_public_providers`: active-only customer-facing projection for search, profiles, and contact actions.
- Enum types matching existing TypeScript lifecycle/domain values.
- Constraints for provider type, status, location kind, launch county, specialties, authorization attestation, ZIP shape, vehicle compatibility, V1 image deferral, and physical/mobile location shape.
- Status-transition functions/triggers aligned to the existing lifecycle.
- Indexes for actual lookup paths: status, physical ZIP, services, and mobile service ZIPs.

The schema intentionally avoids customer accounts, provider accounts, reviews, ratings, bookings, payments, quotes, chat, AI, CRM, subscriptions, saved vehicles, repair history, image storage, and notification systems.

## Public/Private Separation

`provider_records` contains private/admin fields, including:

- authorization relationship;
- authorization attestation;
- submitted registration value and verification state;
- admin notes;
- reviewer identity;
- lifecycle review timestamps.

`active_public_providers` exposes only active customer-facing data required by the current app:

- provider ID and name;
- provider type and active status;
- physical/mobile location details needed for matching/profile display;
- public contact fields;
- services and vehicle compatibility;
- description;
- basic public trust flags.

The public projection excludes authorization, admin notes, private review metadata, and registration submission details.

## RLS Posture

Default posture is deny unless explicitly required.

- RLS is enabled on `admin_users` and `provider_records`.
- Direct privileges on `admin_users` and `provider_records` are revoked from `anon` and `authenticated`.
- `anon` and `authenticated` receive `select` only on `active_public_providers`.
- No anonymous insert/update policy exists for `provider_records`.
- Browser clients must not write provider submissions directly to Supabase.
- Browser clients must not update lifecycle status.

Server-side code may use the server-only Supabase secret key only inside trusted Next.js server code. Secret keys bypass RLS, so server code must still enforce validation, lifecycle rules, and admin authorization before writing.

## Admin Authorization Design

Supabase Auth identity is not authorization by itself.

The migration creates `admin_users`, keyed by `auth.users.id`, so only explicitly allow-listed authenticated Supabase users can be treated as MechanicMatchFL admins.

No owner UUID, email, password, token, or other PII is committed. The owner admin record must be inserted after migration using the real Supabase Auth UUID from the provisioned project.

Suggested owner seeding procedure after the migration is applied:

1. Sign in to Supabase Dashboard.
2. Open Authentication and copy the owner admin user's UUID.
3. Open SQL editor.
4. Run:

```sql
insert into public.admin_users (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin');
```

Replace the all-zero UUID with the real owner admin Auth UUID. Do not commit that UUID to the repository.

## Provider Submission Trust Boundary

The production submission path should be:

public form -> Next.js server action or route handler -> existing server validation -> durable provider record

The browser must not choose:

- `active`;
- `approved`;
- admin metadata;
- verification state;
- reviewer identity.

New public submissions should begin as `submitted`, matching `createSubmittedProviderRecord`.

## Database Access Boundary

Phase 1A adds `src/providers/providerPersistence.ts` as the application boundary for future live persistence.

The boundary defines operations for:

- creating provider submissions;
- listing submissions for an authorized admin;
- loading one submission for an authorized admin;
- performing a lifecycle transition;
- listing active public providers;
- loading one active public provider by ID.

It also contains row mappers so database shape does not leak through React components or domain logic.

## Environment Variables

Client-safe:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key for browser-safe clients and SSR auth helpers.

Server-only:

- `SUPABASE_SECRET_KEY`: Supabase secret key for trusted server-side operations only.

Do not put `SUPABASE_SECRET_KEY` or any database password/token in a `NEXT_PUBLIC_*` variable.

`.env.example` documents placeholder names only. Real `.env` and `.env*.local` files remain gitignored.

## Dependencies

No Supabase dependency is added in Phase 1A.

Current Supabase documentation recommends `@supabase/ssr` and `@supabase/supabase-js` when implementing live Next.js SSR auth/session clients. This phase stops before live client wiring, so adding packages now would be premature.

When implementation begins, use the modern Supabase publishable/secret key strategy rather than new code that depends on legacy `anon` or `service_role` naming.

## Migration Procedure

Do not run this migration against production until the owner approves live database changes.

When approved:

1. Review `supabase/migrations/202609160001_prepare_provider_persistence.sql`.
2. Apply the migration through the chosen Supabase migration workflow.
3. Seed `admin_users` with the real owner admin Auth UUID.
4. Add production environment variables in the hosting platform.
5. Wire Next.js server-side submission/admin/public-provider operations to the persistence boundary.
6. Run the full verification stack before any public launch.

## Remaining Owner Actions

- Approve applying the migration to the live Supabase project.
- Provide the owner admin Supabase Auth UUID through a secure channel or seed it directly in Supabase.
- Add production environment variable values in the deployment environment.
- Approve dependency installation and live Next.js Supabase client wiring in a later phase.
- Keep public signups and anonymous sign-ins disabled unless a future product scope explicitly changes that.

## Unverified Until Live Connection

Phase 1A does not verify:

- live Supabase connectivity;
- Supabase Auth cookie/session behavior;
- live RLS behavior through Supabase APIs;
- production admin login flow;
- production provider submission writes;
- production public provider reads;
- deployment environment variables.

Those remain future implementation and verification tasks.
