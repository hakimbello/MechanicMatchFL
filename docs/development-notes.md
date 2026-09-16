# MechanicMatchFL Development Notes

## Geography Coverage

M2 and M3 introduced a limited development ZIP/centroid set for Miami-Dade and Broward so deterministic matching and the customer search flow could be tested without a production geography system.

M10 separates ZIP eligibility from distance-capable coordinate data. Customer search now accepts the documented Miami-Dade and Broward launch ZIP set in `src/geography/launchGeography.ts`, while approximate distance labels remain limited to ZIPs with existing trusted coordinates. For launch ZIPs without coordinates, the matcher uses county-level eligibility and does not invent mileage.

Post-launch geography work should replace the static ZIP source with an approved maintained data source or service, then add trusted coordinates or geocoding where needed.

## M5 Temporary Provider Submission Infrastructure

M5 uses a development-only provider submission repository backed by browser `localStorage` in the UI and an in-memory repository in tests. This proves the submission, lifecycle, admin review, and publication-safety rules without introducing a production database during this milestone.

Phase 1B replaces the production path with Supabase-backed server persistence and protected admin review. The remaining non-production repositories exist only for tests or local fallback behavior when live Supabase environment variables are absent.

Remaining production requirements before launch:

- configure Supabase environment variables in the target runtime;
- live-verify provider submission writes, public active-provider reads, admin login, allow-list authorization, sign-out, and lifecycle mutations;
- keep provider images deferred unless production image storage, moderation, and validation are explicitly added;
- preserve the lifecycle rules so draft/submitted/under-review/changes-requested/rejected/deactivated providers cannot become public accidentally.

The `/admin/providers` route is now an authenticated and allow-listed admin route. M10 still prevents development fixture provider data from becoming the default provider source in `NODE_ENV=production`.

## M6 SEO Foundation Notes

M6 adds a technical SEO foundation without creating mass landing pages. See `docs/seo-foundation.md` for canonical URL, sitemap, robots/noindex, structured-data, and future landing-page quality rules.

Production SEO still requires final domain ownership, `NEXT_PUBLIC_SITE_URL` configuration, production sitemap/robots verification, and Search Console setup after the domain is connected.

## M7 Analytics, Privacy, and Security Notes

M7 adds Vercel Web Analytics instrumentation, a current-state privacy page, conservative security headers, and a production guard for the development-only admin route. See `docs/privacy-security.md` for data-flow and security details.

The consolidated production blocker register now lives in `docs/production-blockers.md`.
