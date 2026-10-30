# M16 Launch Readiness Checklist

This checklist is a release gate, not a statement that production is ready. Every required item must have dated evidence and an owner before launch.

## Current release status

- [x] M16 code is isolated from `main` for independent review.
- [x] English and Spanish public routes share the same provider, review, suspension, photo, and matching eligibility boundaries.
- [x] Sensitive HTML routes emit page-level `noindex` metadata and defense-in-depth `X-Robots-Tag` headers.
- [x] Verification routes exclude analytics and use `no-referrer`.
- [ ] M11 geographic/profile migration applied: **NOT EXECUTED**.
- [ ] M12 review migration applied: **NOT EXECUTED**.
- [ ] M13 trust and safety migration applied: **NOT EXECUTED**.
- [ ] M14 photo migration applied: **NOT EXECUTED**.
- [ ] M14 private Storage buckets and policies created: **NOT EXECUTED**.
- [ ] Production deployment activated: **NOT EXECUTED**.

## Database rehearsal and rollback

- [ ] Create an isolated Supabase rehearsal project with production-equivalent PostgreSQL and Auth settings.
- [ ] Apply the committed migrations in order: baseline, M11, M12, M13, then M14.
- [ ] Record migration output, schema diff, view column order, grants, RLS policies, function ownership, and function `search_path`.
- [ ] Exercise legacy provider rows and validate every `NOT VALID` constraint before Production.
- [ ] Verify anonymous denial for private provider, review, claim, dispute, incident, appeal, moderation, and photo records.
- [ ] Verify active-only and nonsuspended public providers, reviews, ratings, responses, and photos.
- [ ] Rehearse each guarded rollback in reverse order using disposable data.
- [ ] Confirm rollback guards refuse destructive removal while M11-M14 data exists.
- [ ] Document the restore point, named operator, approval window, and stop conditions for the live migration.

## Storage operations

- [ ] Create private original and normalized-photo buckets exactly as documented in `docs/m14-provider-photo-operations.md`.
- [ ] Verify bucket policies deny anonymous and ordinary authenticated object access.
- [ ] Verify application-mediated public downloads recheck approved, active, claimed, and nonsuspended eligibility.
- [ ] Schedule expired upload-ticket cleanup.
- [ ] Schedule orphan original and normalized-object reconciliation.
- [ ] Define retention for rejected, removed, and failed uploads without deleting moderation evidence prematurely.
- [ ] Alert on repeated cleanup failures and document a manual reconciliation procedure.

## Environment and domain

- [ ] Confirm required Production variable names are present without copying values into tickets or logs.
- [ ] Confirm `SUPABASE_SECRET_KEY` is server-only and absent from browser bundles.
- [ ] Configure and verify the final `NEXT_PUBLIC_SITE_URL` canonical origin.
- [ ] Connect `mechanicmatchfl.com` and the chosen `www` redirect.
- [ ] Verify DNS records, ownership, HTTPS issuance, renewal, redirect behavior, and no mixed content.
- [ ] Verify canonical, hreflang, robots, and sitemap output on the final origin.
- [ ] Register the canonical property in Google Search Console and submit the production sitemap only after launch approval.

## Product, content, and accessibility

- [ ] Complete native-speaker Spanish editorial review of navigation, search, forms, reviews, safety language, privacy content, and metadata.
- [ ] Verify proper names and provider-authored content remain untranslated.
- [ ] Test keyboard-only navigation, skip link, focus order, validation announcements, and zoom at 200%.
- [ ] Test public English and Spanish flows at 390px and representative desktop widths on real browsers.
- [ ] Validate color contrast with an automated checker and manual focus review.
- [ ] Confirm no fictional active providers, fabricated ratings, fake reviews, or unsupported claims appear publicly.

## Monitoring and launch control

- [ ] Keep Vercel's ignored-build safeguard enabled until the launch change is explicitly approved.
- [ ] Capture the current Production deployment and aliases before activation.
- [ ] Configure uptime checks for the home page, sitemap, robots, and a known public profile.
- [ ] Configure server-error monitoring without recording credentials, tokens, reporter PII, or private moderation data.
- [ ] Verify analytics events contain only the documented allowlisted fields.
- [ ] Define launch-day owners for application, Supabase, DNS, and incident response.
- [ ] Define rollback criteria for elevated errors, authorization failures, migration errors, missing public data, or incorrect indexing.
- [ ] Keep the prior known-good deployment available and document the exact Vercel rollback procedure.

## Performance evidence

The M15 baseline production build contained 19 emitted client JavaScript chunk files totaling 952,266 bytes uncompressed. The verified M16 build also contains 19 files totaling 953,520 bytes, an increase of 1,254 bytes (0.13%) for localized validation announcements. No client dependency was added, and authorization and eligibility checks remain server-side. This is a coarse build artifact measurement, not a Core Web Vitals result.

Core Web Vitals remain **NOT VERIFIED** until the application is exercised through a representative Preview or controlled Production environment with realistic provider data and network conditions.

## Launch decision

Launch remains blocked until the M11-M14 migration and Storage rehearsal, Production configuration, domain/SSL checks, native-speaker Spanish review, monitoring, and rollback evidence above are complete and independently approved.
