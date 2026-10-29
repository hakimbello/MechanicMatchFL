-- M11: mobile radius coverage and optional provider-reported profile details.
-- Apply only through an authorized Supabase migration workflow after review.

alter table public.provider_records
  add column if not exists years_experience smallint,
  add column if not exists spoken_languages text[];

alter table public.provider_records
  drop constraint if exists provider_records_years_experience_range;

alter table public.provider_records
  add constraint provider_records_years_experience_range
  check (years_experience is null or years_experience between 1 and 100);

alter table public.provider_records
  drop constraint if exists provider_records_mobile_radius_pair;

alter table public.provider_records
  add constraint provider_records_mobile_radius_pair check (
    (service_base_zip is null and service_radius_miles is null)
    or (service_base_zip is not null and service_radius_miles is not null)
  ) not valid;

-- Preserve county-only legacy rows while allowing new explicit ZIP or radius coverage.
alter table public.provider_records
  drop constraint if exists provider_records_location_shape;

alter table public.provider_records
  add constraint provider_records_location_shape check (
    (
      location_kind = 'physical'
      and street is not null
      and city is not null
      and county is not null
      and zip is not null
    )
    or (
      location_kind = 'mobile'
      and (
        cardinality(service_zip_codes) > 0
        or cardinality(service_counties) > 0
        or (service_base_zip is not null and service_radius_miles is not null)
      )
    )
  );

drop view if exists public.active_public_providers;

create view public.active_public_providers as
select
  id,
  business_name as name,
  provider_type,
  'active'::public.provider_status as status,
  location_kind,
  phone,
  email,
  website,
  services,
  all_makes,
  makes_serviced,
  specialty_makes,
  street,
  city,
  county,
  zip,
  latitude,
  longitude,
  service_zip_codes,
  service_counties,
  service_base_zip,
  service_radius_miles,
  service_base_latitude,
  service_base_longitude,
  description,
  false as claimed_profile,
  false as verified,
  null::timestamptz as verified_at,
  years_experience,
  spoken_languages
from public.provider_records
where status = 'active';

revoke all on table public.active_public_providers from anon, authenticated;
grant select on table public.active_public_providers to anon, authenticated;

comment on column public.provider_records.years_experience is
  'Optional provider-reported years of experience. Public only after the provider is active.';

comment on column public.provider_records.spoken_languages is
  'Optional provider-reported language names. Public only after the provider is active.';

comment on view public.active_public_providers is
  'Active-only public provider projection. Excludes authorization, registration, admin notes, and reviewer identity.';
