# M10 Production Close

M10 is code-complete for the items that can be closed inside the repository, but MechanicMatchFL is not production-launch ready. Durable provider persistence and production admin authentication require owner-provisioned infrastructure before a public launch.

## Closed in Code

- Launch ZIP eligibility now covers documented Miami-Dade and Broward ZIPs in `src/geography/launchGeography.ts`.
- Distance labels remain limited to the existing trusted coordinate set. For launch ZIPs without coordinates, matching uses same-county eligibility and does not fabricate mileage.
- Provider images are deferred from V1. The submission UI no longer asks for an image reference, and validation rejects stale `profileImageRef` input.
- Development provider fixtures are disabled as the default provider source in `NODE_ENV=production`; production will not show fictional provider listings by default.
- Admin provider review remains blocked in production through the existing production route guard.

## Launch Sources Used for M10 ZIP Eligibility

- Miami-Dade ZIP list: https://www.miamidadefl.org/ZIP_Codes.html
- Broward ZIP list: https://www.zipdatamaps.com/en/us/zip-maps/fl/county/borders/broward-county
- Broward ZIP boundary service cross-check: https://services.arcgis.com/JMAJrTsHNLrSsWf5/arcgis/rest/services/Broward_Zip_Codes/FeatureServer

These sources close the previous limited-launch-ZIP code blocker, but they do not create a maintained production geocoding system. Future work should replace the static list with an approved maintained source or service if the product needs automated ZIP updates, boundary math, or exact distance calculations.

## Still Blocking Public Launch

- Durable server-side provider persistence is not implemented. Current provider submissions are browser-local development storage only.
- Production admin authentication and authorization are not implemented. `/admin/providers` is intentionally development-only and 404s in production.
- Production provider records are not connected. M10 deliberately prevents development fixtures from appearing as production listings.
- The final domain, `NEXT_PUBLIC_SITE_URL`, Vercel Web Analytics verification, Search Console, production CSP, HSTS, and any required privacy contact mechanism still need owner-side setup and verification.

## Owner Action Required

1. Provision a production database or storage service for provider submissions and public provider records.
2. Choose and provision production admin authentication/authorization.
3. Provide the production environment variable names and credentials for the chosen database and auth provider.
4. Connect and verify `https://MechanicMatchFL.com`, configure `NEXT_PUBLIC_SITE_URL`, and verify robots/sitemap output after deployment.
5. Enable and verify Vercel Web Analytics in the production project dashboard.
6. Decide whether a real privacy contact mechanism is required before public launch.

After those decisions and credentials exist, the next implementation should wire provider submission persistence, production provider reads, and authenticated admin review to the chosen services.

## Post-M10 Phase 1B Update

Production Infrastructure Phase 1B wires the code path for Supabase-backed provider submissions, active public-provider reads, admin login, allow-list authorization, and durable lifecycle mutations on the `production-supabase-persistence` branch.

The app still is not production-launch ready until the required environment variables are configured outside the repository and live integration behavior is explicitly verified. See `docs/supabase-production-setup.md` and `docs/production-blockers.md` for the current state.
