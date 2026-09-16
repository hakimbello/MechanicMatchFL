-- MechanicMatchFL Phase 1A: durable provider persistence preparation.
-- This migration is schema-only. It does not seed owner data, credentials, or live provider records.

do $$
begin
  create type public.provider_status as enum (
    'draft',
    'submitted',
    'under-review',
    'approved',
    'active',
    'changes-requested',
    'rejected',
    'deactivated'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.provider_type as enum (
    'independent-auto-repair-shop',
    'mobile-mechanic',
    'tire-service-shop',
    'repair-specialist'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.provider_location_kind as enum ('physical', 'mobile');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.launch_county as enum ('Miami-Dade', 'Broward');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.provider_specialty as enum (
    'general-repair',
    'engine',
    'transmission',
    'brakes',
    'tires-wheels',
    'ac',
    'electrical-diagnostics',
    'suspension',
    'maintenance',
    'check-engine-diagnostics',
    'diesel',
    'exhaust',
    'cooling-radiator',
    'alignment'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.authorization_relationship as enum (
    'myself',
    'my-business',
    'family-member',
    'i-work-for-this-business'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.registration_verification_status as enum ('submitted-unverified', 'verified', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_role as enum ('admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table if not exists public.provider_records (
  id text primary key,
  status public.provider_status not null default 'submitted',
  business_name text not null check (length(trim(business_name)) > 0),
  provider_type public.provider_type not null,
  location_kind public.provider_location_kind not null,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  email text not null check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  website text,
  services public.provider_specialty[] not null check (cardinality(services) > 0),
  all_makes boolean not null default true,
  makes_serviced text[] not null default '{}',
  specialty_makes text[] not null default '{}',
  street text,
  city text,
  county public.launch_county,
  zip text check (zip is null or zip ~ '^[0-9]{5}$'),
  latitude numeric(9,6),
  longitude numeric(9,6),
  service_zip_codes text[] not null default '{}',
  service_counties public.launch_county[] not null default '{}',
  service_base_zip text check (service_base_zip is null or service_base_zip ~ '^[0-9]{5}$'),
  service_radius_miles numeric(6,2) check (service_radius_miles is null or service_radius_miles > 0),
  service_base_latitude numeric(9,6),
  service_base_longitude numeric(9,6),
  description text not null check (length(trim(description)) between 20 and 500),
  profile_image_ref text,
  registration_value text,
  registration_verification_status public.registration_verification_status,
  authorization_relationship public.authorization_relationship not null,
  authorization_attested boolean not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz,
  last_reviewed_by uuid references public.admin_users(user_id),
  admin_notes text,
  constraint provider_records_no_v1_images check (profile_image_ref is null),
  constraint provider_records_authorized_submission check (authorization_attested is true),
  constraint provider_records_vehicle_compatibility check (
    all_makes is true or cardinality(makes_serviced) > 0
  ),
  constraint provider_records_registration_pair check (
    (registration_value is null and registration_verification_status is null)
    or (registration_value is not null and registration_verification_status is not null)
  ),
  constraint provider_records_location_shape check (
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
  ),
  constraint provider_records_coordinate_pair check (
    (latitude is null and longitude is null) or (latitude is not null and longitude is not null)
  ),
  constraint provider_records_mobile_base_coordinate_pair check (
    (service_base_latitude is null and service_base_longitude is null)
    or (service_base_latitude is not null and service_base_longitude is not null)
  ),
  constraint provider_records_status_insert_shape check (
    status in ('draft', 'submitted', 'under-review', 'approved', 'active', 'changes-requested', 'rejected', 'deactivated')
  )
);

create index if not exists provider_records_status_idx on public.provider_records(status);
create index if not exists provider_records_physical_zip_idx on public.provider_records(zip) where location_kind = 'physical';
create index if not exists provider_records_services_gin_idx on public.provider_records using gin(services);
create index if not exists provider_records_service_zip_codes_gin_idx on public.provider_records using gin(service_zip_codes);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_provider_status_transition_allowed(
  from_status public.provider_status,
  to_status public.provider_status
)
returns boolean
language sql
immutable
as $$
  select case
    when from_status = to_status then true
    when from_status = 'draft' and to_status = 'submitted' then true
    when from_status = 'submitted' and to_status = 'under-review' then true
    when from_status = 'under-review' and to_status in ('approved', 'changes-requested', 'rejected') then true
    when from_status = 'approved' and to_status = 'active' then true
    when from_status = 'active' and to_status = 'deactivated' then true
    else false
  end;
$$;

create or replace function public.enforce_provider_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.status not in ('draft', 'submitted') then
    raise exception 'provider_records may only be inserted as draft or submitted';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not public.is_provider_status_transition_allowed(old.status, new.status) then
      raise exception 'Provider status cannot move from % to %', old.status, new.status;
    end if;

    if new.status = 'under-review' then
      new.reviewed_at = coalesce(new.reviewed_at, now());
    elsif new.status = 'approved' then
      new.approved_at = coalesce(new.approved_at, now());
    elsif new.status = 'active' then
      new.activated_at = coalesce(new.activated_at, now());
    elsif new.status = 'deactivated' then
      new.deactivated_at = coalesce(new.deactivated_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists touch_provider_records_updated_at on public.provider_records;
create trigger touch_provider_records_updated_at
before update on public.provider_records
for each row execute function public.touch_updated_at();

drop trigger if exists enforce_provider_records_status_transition on public.provider_records;
create trigger enforce_provider_records_status_transition
before insert or update on public.provider_records
for each row execute function public.enforce_provider_status_transition();

drop trigger if exists touch_admin_users_updated_at on public.admin_users;
create trigger touch_admin_users_updated_at
before update on public.admin_users
for each row execute function public.touch_updated_at();

create or replace function public.is_mechanicmatch_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and disabled_at is null
  );
$$;

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
  null::timestamptz as verified_at
from public.provider_records
where status = 'active';

alter table public.admin_users enable row level security;
alter table public.provider_records enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.provider_records from anon, authenticated;
revoke all on table public.active_public_providers from anon, authenticated;

grant select on table public.active_public_providers to anon, authenticated;

create policy "mechanicmatch admins can read provider records"
on public.provider_records
for select
to authenticated
using (public.is_mechanicmatch_admin());

create policy "mechanicmatch admins can update provider records"
on public.provider_records
for update
to authenticated
using (public.is_mechanicmatch_admin())
with check (public.is_mechanicmatch_admin());

comment on table public.provider_records is
  'Durable provider submissions and lifecycle records. Base table is private; public reads use active_public_providers.';

comment on view public.active_public_providers is
  'Public active-provider projection for search/profile/contact. Excludes authorization, admin notes, and private review fields.';

comment on table public.admin_users is
  'Private allow-list of MechanicMatchFL administrator Supabase Auth user IDs. Owner UUIDs must be inserted after migration, never committed.';
