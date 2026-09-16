# Supabase Production Setup

Production Infrastructure Phase 1B wires MechanicMatchFL application code to the approved Supabase persistence and admin-auth architecture. It does not deploy the app, modify the live Supabase schema, configure Vercel, or mark the product production-ready.

## Current Live State

The Phase 1A migration has been applied to the real MechanicMatchFL Supabase project.

Verified live database objects:

- `public.admin_users`
- `public.provider_records`
- `public.active_public_providers`

One owner administrator has already been created in Supabase Auth and allow-listed in `public.admin_users` with role `admin`. The repository does not store that UUID, the admin email, passwords, keys, tokens, or any other secret.

Public Supabase signups and anonymous sign-ins are expected to remain disabled. Email authentication remains enabled for the administrator login flow.

## Application Architecture

MechanicMatchFL keeps the locked MVP product scope:

- public provider submission is accountless;
- provider submissions flow through a trusted Next.js server action before any database write;
- Supabase PostgreSQL stores durable provider records;
- Supabase Auth establishes administrator identity;
- `public.admin_users` authorizes authenticated admins by immutable Supabase Auth UUID;
- public search, profiles, and sitemap read only active public provider data;
- customer accounts, provider accounts, reviews, ratings, bookings, payments, quotes, chat, AI, CRM, subscriptions, saved vehicles, repair history, image storage, and notifications remain out of scope.

## Supabase Clients

Browser-safe client:

- file: `src/supabase/browserClient.ts`
- uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- used for administrator email/password sign-in through Supabase Auth
- must never receive `SUPABASE_SECRET_KEY`

Auth-aware server client:

- file: `src/supabase/serverClient.ts`
- uses Supabase SSR cookie handling from `@supabase/ssr`
- reads and refreshes authenticated sessions server-side
- used to identify the current Supabase Auth user before admin authorization

Privileged server-only data client:

- file: `src/supabase/serverClient.ts`
- guarded by `server-only`
- uses `SUPABASE_SECRET_KEY` only in trusted server code
- writes accountless provider submissions and performs controlled admin reads/mutations through the persistence boundary

Secret-key access can bypass RLS, so server validation and authorization remain mandatory before any write.

## Provider Submission Flow

Production flow:

`/list-your-business` form -> Next.js server action -> server validation -> submitted provider record -> `provider_records`

The browser cannot choose lifecycle status, approval state, verification state, reviewer identity, timestamps, IDs, admin notes, or image data. New submissions are created as `submitted` by `createSubmittedProviderRecord`.

If persistence fails, the form returns a truthful non-sensitive error and does not show false success.

## Public Read Flow

Production public reads use the runtime provider persistence boundary:

- home/search loads durable active providers;
- profile pages load an active provider by ID;
- sitemap reads active providers before building mechanic URLs.

The public projection excludes authorization fields, admin notes, private registration submissions, reviewer identity, and non-active providers. Unknown or inactive providers remain non-public.

Development fixtures remain isolated for non-production local/test behavior. An empty production provider database should produce truthful empty public results.

## Admin Auth Flow

The admin login route is `/admin/login`.

Admins sign in with Supabase Email authentication using email and password. The app does not add customer login, provider login, public registration, social login, or a custom password/JWT system.

Failure messages remain generic and do not reveal whether an email is allow-listed as an administrator.

## Admin Authorization Flow

Authentication is not authorization. Each protected admin data surface must:

1. read the authenticated Supabase user server-side;
2. use the immutable Supabase Auth user ID;
3. check `public.admin_users` through the `is_mechanicmatch_admin` RPC;
4. allow admin data/actions only when the user is enabled and allow-listed.

Authorization does not depend on email strings, client-side booleans, localStorage, hidden routes, robots/noindex, or environment-variable email allow-lists.

Unauthenticated admin users are redirected to `/admin/login`. Authenticated but unauthorized users are denied without exposing provider records.

## Admin Lifecycle Flow

Authorized admin status updates flow through a server action:

admin UI -> server action -> server auth check -> allow-list authorization -> lifecycle validation -> durable `provider_records` mutation

Only existing approved transitions are allowed:

- `draft` -> `submitted`
- `submitted` -> `under-review`
- `under-review` -> `approved`
- `under-review` -> `changes-requested`
- `under-review` -> `rejected`
- `approved` -> `active`
- `active` -> `deactivated`

The database trigger remains defense-in-depth. Server code also validates transitions before mutating.

## Audit Fields

Admin lifecycle mutations set `last_reviewed_by` from the authorized Supabase Auth user ID. The Phase 1A database trigger remains responsible for durable lifecycle timestamps such as `updated_at`, `reviewed_at`, `approved_at`, `activated_at`, and `deactivated_at`.

No audit-log system, password storage, token storage, or admin-note workflow is added in Phase 1B.

## Request Integrity

Admin mutations are implemented as Next.js server actions and still perform server-side authentication, allow-list authorization, and transition validation at the data boundary. Middleware/proxy session refresh improves auth UX but is not the only security boundary.

No custom CSRF token system is added in Phase 1B. Future hardening may revisit explicit rate limiting or additional request-integrity controls if the production hosting/runtime requirements change.

## Environment Variables

Client-safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `SUPABASE_SECRET_KEY`

Use the same variable names locally and in Vercel. Real values belong in local secret files or hosting environment settings, never in source code, tests, fixtures, docs, URLs, analytics, or Git history.

## Testing Strategy

Ordinary tests must not call the live Supabase project. Unit and source-boundary tests cover:

- submitted status enforcement for accountless provider submissions;
- persistence failure handling;
- active-only public provider reads;
- private field exclusion from public projection;
- admin lifecycle validation;
- admin login without public signup;
- server-side admin authorization wiring;
- secret/client boundary separation;
- sitemap/profile runtime provider data wiring;
- analytics privacy boundaries.

Live integration verification requires environment variables to be configured outside chat and must be explicitly authorized separately.

## Remaining Owner Actions

- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in the intended local or hosting environment.
- Explicitly authorize a later live integration smoke test.
- Explicitly authorize any GitHub push, merge, Vercel configuration, or deployment when ready.
- Keep public signups and anonymous sign-ins disabled unless a future product decision changes scope.
- Consider future production hardening for accountless submission rate limiting.

## Unverified Until Live Connection

Phase 1B does not verify:

- live Supabase connectivity from this local runtime;
- real Supabase Auth cookie/session behavior against configured credentials;
- live provider submission writes;
- live admin sign-in;
- live allow-listed admin authorization;
- live admin lifecycle mutations;
- live public provider reads from `active_public_providers`;
- deployed Vercel environment variables;
- production domain sitemap/robots output.
