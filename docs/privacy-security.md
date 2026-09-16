# MechanicMatchFL Privacy and Security Notes

## Customer Data Flow

Customer search inputs currently include vehicle year, make, model, repair or service category, and ZIP code.

- Search runs against active public provider data loaded through the runtime provider boundary.
- Search inputs are not persisted in a production database.
- Service, make, and ZIP may appear in mechanic profile URLs as search context so the page can explain why a provider matched.
- Analytics events intentionally exclude raw ZIP, model, year, names, phone numbers, email addresses, VINs, free-form messages, and arbitrary query-string contents.
- Analytics may include service category, vehicle make, coarse launch area, and result count.

## Provider Data Flow

Provider submission inputs currently include business/provider name, phone, email, provider type, services, vehicle compatibility, physical address or mobile service area, description, optional Florida repair registration, authorization relationship, and authorization attestation.

- Production provider submissions flow through a Next.js server action and are written to Supabase provider records when Supabase environment variables are configured.
- Development and tests may still use isolated in-memory storage so ordinary verification does not require live production secrets.
- Stored provider records may include provider phone, email, street address, description, registration value, and authorization fields.
- Public reads use the active-provider projection rather than the private provider-record base table.
- Provider images are deferred from V1. The current UI does not collect image references, and validation rejects stale image-reference submissions.
- Analytics for provider submissions intentionally includes only provider type and location kind.

## Analytics Events

Approved platform: Vercel Web Analytics.

Events currently instrumented:

- `mechanic_search_submitted`: `service_category`, `vehicle_make`, `launch_area`
- `mechanic_search_results_viewed`: `service_category`, `result_count`
- `mechanic_profile_viewed`: `provider_id`, `provider_type`, optional `service_category`
- `mechanic_contact_clicked`: `provider_id`, `contact_method`, `source_page`, optional `service_category`
- `provider_submission_started`: no custom properties
- `provider_submission_completed`: `provider_type`, `location_kind`

Analytics failures are caught by the analytics boundary and must not block search, profile navigation, contact links, or provider submission.

## Prohibited Analytics Data

Do not send customer or provider PII to analytics. Prohibited examples include customer name, customer email, customer phone, provider email, provider phone, street address, raw ZIP, exact coordinates, VIN, provider registration numbers, authorization relationship or attestation text, free-form descriptions, free-form messages, full form payloads, and arbitrary query-string contents.

## Public vs Private Provider Fields

Public active profiles may show intended business-facing provider information such as provider name, type, services, makes, description, public contact links, and public location/service-area information.

Submission/admin-only data must not leak into public profiles merely because it exists in a submission record. Private fields include authorization relationship, authorization attestation, internal review status, and submitted-unverified registration values.

## Admin Access

`/admin/providers` is a protected admin review surface. Unauthenticated users are redirected to `/admin/login`; authenticated users must also be enabled in `public.admin_users` before private provider records or lifecycle actions are available.

Admin authorization uses the immutable Supabase Auth user ID through the server-side `is_mechanicmatch_admin` RPC. It does not rely on email strings, localStorage, hidden routes, robots.txt, or `noindex`.

## Security Headers

Configured headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `X-Frame-Options: DENY`

A strict Content-Security-Policy is not finalized in M7 because it should be validated against the production Vercel/Next.js script requirements, including Vercel Web Analytics, before launch. HSTS should be finalized after the production domain is connected and HTTPS behavior is verified.

## URL and Link Validation

Provider phone links are generated only from valid 10-digit North American numbers. Email links require a basic valid email shape. Provider website links must parse as `http:` or `https:` URLs. `javascript:` and `data:` URLs remain non-actionable.

Mechanic profile IDs are encoded when generating profile links. Query parameters used for search context are not canonical SEO URLs.

## Structured Data Escaping

Provider JSON-LD uses actual provider data only and is serialized with escaping for `<`, `>`, `&`, and Unicode line separators to prevent script-context breakout.

## Environment Variables

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public by design and must not contain secrets. `SUPABASE_SECRET_KEY` is server-only and must never be placed in a `NEXT_PUBLIC_*` variable, source code, tests, fixtures, docs, URLs, analytics, or Git history.

## Remaining Launch Blockers

See `docs/production-blockers.md` for the consolidated blocker register.
