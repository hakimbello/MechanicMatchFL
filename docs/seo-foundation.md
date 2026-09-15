# MechanicMatchFL SEO Foundation

## Production domain strategy

The intended production domain is `https://MechanicMatchFL.com`. Code must use the centralized site URL helpers in `src/seo/site.ts` instead of scattering absolute URLs through components.

URL resolution order:

1. `NEXT_PUBLIC_SITE_URL` when explicitly configured.
2. `VERCEL_URL` for Vercel preview builds.
3. `https://MechanicMatchFL.com` as the future production fallback.

Before production launch, configure the final canonical origin in Vercel and confirm the domain is owned and connected.

## Canonical rules

- Homepage canonical: `/`.
- Provider-acquisition page canonical: `/list-your-business`.
- Mechanic profile canonical: `/mechanics/[providerId]`.
- Search-context query parameters such as `service`, `make`, and `zip` may shape the customer-visible profile context, but they must not create duplicate indexable profile URLs.
- The interactive search experience must not become an uncontrolled indexable URL space for year x make x model x repair x ZIP combinations.

## Sitemap eligibility

The sitemap includes only legitimate public indexable URLs:

- homepage;
- `/list-your-business`;
- active public mechanic profiles.

The sitemap excludes admin pages, query-parameter profile variants, unknown profiles, and providers that are submitted, under review, changes requested, rejected, deactivated, or otherwise not public. Sitemap provider eligibility must continue to use the same public-provider lifecycle rules as the application.

## Robots and noindex rules

`/admin/*` is disallowed in robots and the admin provider review page is marked `noindex,nofollow`. Public pages, including active mechanic profiles, must remain crawlable.

## Mechanic-profile structured data

Eligible public mechanic profiles may emit truthful `AutoRepair` JSON-LD based only on provider data already present in the app. Supported fields include name, description, telephone, canonical profile URL, services, address for physical shops, and service area for mobile mechanics.

Do not add fake ratings, reviews, price ranges, hours, awards, certifications, social links, or guarantees.

## Mobile mechanic vs physical shop schema

Physical shops may include a real `PostalAddress` from provider data.

Mobile mechanics must not receive a fabricated storefront address. Use service ZIP codes or counties as `areaServed` instead.

## Future SEO landing pages

Do not build a thin City x Make x Problem page factory.

A future SEO landing page should not be published unless it has sufficient relevant provider inventory and enough unique useful content to satisfy real customer intent. Possible future examples include city/service pages such as `/miami/mobile-mechanics` or `/fort-lauderdale/auto-repair`, but only when inventory density and content quality justify them.

## Production tasks still required

- Connect and verify the production domain.
- Configure `NEXT_PUBLIC_SITE_URL` for production.
- Confirm production sitemap and robots output under the final domain.
- Add Search Console only after real domain ownership exists.
- Preserve existing blockers for full Miami-Dade/Broward geography coverage, durable provider persistence, real admin authentication/authorization, production image storage, and lifecycle/publication safety.
