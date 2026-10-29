-- Roll back M11 without deleting provider records.
-- This aborts if radius-only mobile records exist because the previous schema
-- cannot represent them. Convert those records to explicit ZIP coverage first.
-- It also aborts if provider-reported profile values exist. Export and clear
-- those values through an explicitly approved data migration before retrying.
-- Promote this file to a new timestamped migration and use the authorized
-- Supabase migration runner. Do not run it piecemeal or embed BEGIN/COMMIT.

do $$
begin
  if exists (
    select 1
    from public.provider_records
    where location_kind = 'mobile'
      and cardinality(service_zip_codes) = 0
      and cardinality(service_counties) = 0
      and service_base_zip is not null
      and service_radius_miles is not null
  ) then
    raise exception 'Cannot roll back M11 while radius-only mobile providers exist';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.provider_records
    where years_experience is not null
       or coalesce(cardinality(spoken_languages), 0) > 0
  ) then
    raise exception 'Cannot roll back M11 while provider-reported experience or language values exist; export and clear them explicitly first';
  end if;
end $$;

-- CREATE OR REPLACE cannot remove view columns. Keep typed NULL compatibility
-- columns so the view object, grants, options, rules, and dependents survive.
-- Older application code ignores these trailing columns.
create or replace view public.active_public_providers as
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
  null::smallint as years_experience,
  null::text[] as spoken_languages
from public.provider_records
where status = 'active';

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
      and (cardinality(service_zip_codes) > 0 or cardinality(service_counties) > 0)
    )
  );

alter table public.provider_records
  drop constraint if exists provider_records_mobile_radius_pair,
  drop constraint if exists provider_records_years_experience_range,
  drop column if exists years_experience,
  drop column if exists spoken_languages;

comment on view public.active_public_providers is
  'Public active-provider projection for search/profile/contact. M11 profile columns remain as NULL compatibility fields after rollback.';
