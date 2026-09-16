# M9 Regression and Production QA Handoff

M9 verified the M1-M8 application as an integrated MVP. M9 can pass with production blockers still open; this document is the M10 production-close checklist and should not be treated as launch approval.

## QA Summary

- Customer search, matching, results, profiles, contact CTAs, provider submission, lifecycle transitions, public-provider boundaries, SEO, analytics, privacy, security headers, responsive behavior, keyboard behavior, and production-mode routing were verified together.
- No material V1 application bug was discovered during M9.
- M9 added regression coverage for the documented launch ZIP limitation, approved-but-not-active provider privacy, and full JSON-LD escape characters.
- Production-mode `next start` served public routes, returned 404 for unknown and inactive profiles, returned 404 for `/admin/providers`, served robots and sitemap, and included the M7 security headers.

## Code Blockers

### RESOLVED IN M10 CODE

- Search ZIP eligibility was expanded to documented Miami-Dade and Broward launch ZIP coverage. M10 keeps distance labels limited to ZIPs with existing trusted coordinates and uses same-county matching when only county-level ZIP eligibility is known.
- Provider images were removed from the V1 submission UI and are rejected by validation if a stale client sends `profileImageRef`.
- Development fixture providers are no longer the default production provider source.

### STILL BLOCKING

- Add durable server-side provider persistence. Current provider submissions are stored in browser `localStorage` with an in-memory fallback.
- Add real production admin authentication and authorization, or replace the development admin with a production-safe review surface.
- Replace development fixture listings with durable production provider records before launch.

### VERIFIED NOT A CURRENT CODE BUG

- Approval alone does not publish a provider; only `active` providers are public.
- Submitted, under-review, approved, changes-requested, rejected, and deactivated providers are excluded from public search, profiles, sitemap, and structured data.
- Unsafe contact protocols are non-actionable.
- JSON-LD escaping prevents script breakout for `<`, `>`, `&`, U+2028, and U+2029.
- Production `/admin/providers` returns not-found.

## Infrastructure Blockers

### STILL BLOCKING

- Provision durable provider storage.
- Configure production server-side admin authorization before any production review workflow exists.
- Enable and verify Vercel Web Analytics in the production Vercel project dashboard.

## Domain and SEO Blockers

### STILL BLOCKING

- Connect and verify `https://MechanicMatchFL.com`.
- Configure `NEXT_PUBLIC_SITE_URL` in production.
- Verify production robots and sitemap output after the final domain is connected.
- Add Search Console only after domain ownership is available.

### VERIFIED IN CODE

- Homepage, list-your-business, privacy, and provider profile metadata exist.
- Provider canonicals strip query context.
- Sitemap excludes admin, inactive providers, non-public providers, and query variants.
- Robots allows public crawling and disallows admin paths.

## Security and Privacy Blockers

### STILL BLOCKING

- Establish a real privacy contact mechanism if required before launch.
- Validate a production Content-Security-Policy against Next.js, Vercel, and Vercel Web Analytics requirements.
- Finalize HSTS only after the production domain and HTTPS behavior are verified.

### VERIFIED IN CODE

- Custom analytics excludes raw ZIP, vehicle year, vehicle model, customer contact data, provider phone/email, street address, registration number, authorization text, description, full submission payloads, exact coordinates, and arbitrary query strings.
- Privacy page accurately describes current MVP architecture: browser-local provider submission storage, no production database for customer searches, Vercel Web Analytics, public active-provider projection, external contact links, and unresolved production blockers.
- Security headers are configured for `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`.
- No committed secret pattern was found during M9 repository search.

## Manual Owner Actions

- Decide final V1 launch geography source and acceptance criteria.
- Decide whether submitted provider images are in V1.
- Provide the production privacy contact mechanism if required.
- Configure final production environment variables in Vercel.
- Connect and verify the production domain.
- Enable and verify Vercel Web Analytics.
- Set up Search Console after domain ownership is confirmed.

## Post-Launch Tasks

- Verify production robots and sitemap after deploy and domain connection.
- Re-run dependency audit and production smoke tests before public announcement.
- Monitor analytics events for presence and PII-minimization after production traffic begins.
- Revisit CSP/HSTS after observing production script and asset requirements.

