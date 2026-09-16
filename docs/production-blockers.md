# MechanicMatchFL Production Blocker Register

This register consolidates known launch blockers. Do not mark an item resolved unless the implementation and required owner-side verification actually resolve it.

## Data and Geography

- Verify the M10 Miami-Dade/Broward ZIP source set during the first production deployment. Search ZIP eligibility now covers the documented two-county launch area, but only the original trusted centroid set is used for distance labels.
- Verify live Supabase provider submission writes after environment variables are configured.
- Verify live active public-provider reads against `public.active_public_providers`.
- Provider images are deferred from V1; do not reintroduce image submission until production storage, moderation, and validation are defined.
- Decide whether accountless provider submission requires production rate limiting before launch.

## Admin and Provider Operations

- Verify live Supabase admin login, session refresh, allow-list authorization, sign-out, and durable lifecycle mutations.
- Configure required Supabase environment variables outside the repository.
- Ensure production has real active provider records before expecting public search results.
- Preserve provider lifecycle/publication safety so non-active providers cannot become public accidentally.

## Domain and SEO

- Connect and verify `https://MechanicMatchFL.com`.
- Configure `NEXT_PUBLIC_SITE_URL` in production.
- Verify production robots and sitemap output after domain connection.
- Add Search Console only after domain ownership exists.

## Analytics and Privacy

- Enable and verify Vercel Web Analytics in the Vercel project dashboard after deployment.
- Establish a real privacy contact mechanism if required before launch.
- Update the privacy page when production storage, admin access, provider operations, or contact mechanisms change.

## Security

- Validate a production Content-Security-Policy against Next.js, Vercel, and Vercel Web Analytics script requirements.
- Finalize HSTS only after the production domain and HTTPS behavior are verified.
- Continue dependency audit review before launch.
