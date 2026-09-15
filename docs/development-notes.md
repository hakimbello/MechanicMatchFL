# MechanicMatchFL Development Notes

## Geography Coverage Debt

M2 and M3 introduced a limited development ZIP/centroid set for Miami-Dade and Broward so deterministic matching and the customer search flow can be tested without a production geography system.

This is not production-complete. Before Production Close, replace the current hard-coded ZIP/centroid coverage with an approved geography data source or service that covers the full launch area.

Current limitation is intentionally preserved during M4 to avoid turning profile and lead conversion work into a geocoding milestone.

## M5 Temporary Provider Submission Infrastructure

M5 uses a development-only provider submission repository backed by browser `localStorage` in the UI and an in-memory repository in tests. This proves the submission, lifecycle, admin review, and publication-safety rules without introducing a production database during this milestone.

Production requirements before launch:

- replace the browser/local in-memory repository with durable server-side persistence;
- connect admin access to real authentication and authorization;
- add production image storage before accepting real binary uploads;
- preserve the lifecycle rules so draft/submitted/under-review/changes-requested/rejected/deactivated providers cannot become public accidentally.

The `/admin/providers` route is development-only. It is intentionally not represented as production security.

## M6 SEO Foundation Notes

M6 adds a technical SEO foundation without creating mass landing pages. See `docs/seo-foundation.md` for canonical URL, sitemap, robots/noindex, structured-data, and future landing-page quality rules.

Production SEO still requires final domain ownership, `NEXT_PUBLIC_SITE_URL` configuration, production sitemap/robots verification, and Search Console setup after the domain is connected.
