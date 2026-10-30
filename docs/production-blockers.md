# MechanicMatchFL Production Blocker Register

This register consolidates known launch blockers. Do not mark an item resolved unless the implementation and required owner-side verification actually resolve it.

## Data and Geography

- Rehearse and apply the additive M11-M14 migrations in order. None has been applied to the live project.
- Verify the documented 2026 Census ZCTA launch-area extract and trusted distance behavior against live provider data after M11 is applied.
- Verify live Supabase provider submission writes after environment variables are configured.
- Verify live active public-provider reads against `public.active_public_providers`.
- Create and verify the M14 private Storage buckets and policies, including expired-ticket and orphan-object cleanup. No live bucket setup has been executed.
- Decide whether accountless provider submission requires production rate limiting before launch.

## Admin and Provider Operations

- Verify live Supabase admin login, session refresh, allow-list authorization, sign-out, and durable lifecycle mutations.
- Verify review email delivery, moderation, provider ownership claims, disputes, safety investigations, suspension, appeals, and photo moderation against the rehearsed schema.
- Configure required Supabase environment variables outside the repository.
- Ensure production has real active provider records before expecting public search results.
- Preserve provider lifecycle/publication safety so non-active providers cannot become public accidentally.

## Domain and SEO

- Connect and verify `https://MechanicMatchFL.com`.
- Configure `NEXT_PUBLIC_SITE_URL` in production.
- Verify production robots and sitemap output after domain connection.
- Add Search Console only after domain ownership exists.
- Complete native-speaker editorial review of every Spanish public route and metadata surface.

## Analytics and Privacy

- Enable and verify Vercel Web Analytics in the Vercel project dashboard after deployment.
- Establish a real privacy contact mechanism if required before launch.
- Update the privacy page when production storage, admin access, provider operations, or contact mechanisms change.

## Security

- Validate a production Content-Security-Policy against Next.js, Vercel, and Vercel Web Analytics script requirements.
- Finalize HSTS only after the production domain and HTTPS behavior are verified.
- Continue dependency audit review before launch.
- Record monitoring, incident ownership, migration rollback, and deployment rollback evidence before removing the ignored-build safeguard.
