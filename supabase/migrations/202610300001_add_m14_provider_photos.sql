-- M14: private provider photo uploads, administrator moderation, and controlled public delivery.
-- Apply after M13. The bucket is private and application servers are the only storage callers.

do $$ begin
  create type public.provider_photo_status as enum ('pending', 'approved', 'rejected', 'removed');
exception when duplicate_object then null;
end $$;

create table if not exists public.provider_photo_upload_tickets (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  provider_id text not null references public.provider_records(id) on delete restrict,
  original_object_key text not null unique check (
    original_object_key ~ '^original/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ),
  normalized_object_key text not null unique check (
    normalized_object_key ~ '^normalized/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  ),
  original_media_type text not null check (original_media_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 4194304),
  width integer not null check (width between 1 and 1600),
  height integer not null check (height between 1 and 1200),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  consent_attested boolean not null check (consent_attested),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz,
  constraint provider_photo_ticket_media_extension check (
    (original_media_type = 'image/jpeg' and original_object_key like '%.jpg')
    or (original_media_type = 'image/png' and original_object_key like '%.png')
    or (original_media_type = 'image/webp' and original_object_key like '%.webp')
  )
);

create table if not exists public.provider_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_records(id) on delete restrict,
  claim_id uuid not null references public.provider_claims(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  status public.provider_photo_status not null default 'pending',
  original_object_key text not null unique check (
    original_object_key ~ '^original/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ),
  normalized_object_key text not null unique check (
    normalized_object_key ~ '^normalized/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  ),
  original_media_type text not null check (original_media_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 4194304),
  width integer not null check (width between 1 and 1600),
  height integer not null check (height between 1 and 1200),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  consent_attested_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  moderated_by uuid references public.admin_users(user_id),
  moderated_at timestamptz,
  moderation_reason text check (moderation_reason is null or length(trim(moderation_reason)) between 10 and 1000),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint provider_photo_media_extension check (
    (original_media_type = 'image/jpeg' and original_object_key like '%.jpg')
    or (original_media_type = 'image/png' and original_object_key like '%.png')
    or (original_media_type = 'image/webp' and original_object_key like '%.webp')
  ),
  constraint provider_photo_moderation_shape check (
    (status = 'pending' and moderated_by is null and moderated_at is null and moderation_reason is null and published_at is null)
    or (status = 'approved' and moderated_by is not null and moderated_at is not null and moderation_reason is not null and published_at is not null)
    or (status in ('rejected', 'removed') and moderated_by is not null and moderated_at is not null and moderation_reason is not null and published_at is null)
  )
);

create unique index if not exists provider_photos_one_pending_idx
on public.provider_photos(provider_id) where status = 'pending';
create unique index if not exists provider_photos_one_approved_idx
on public.provider_photos(provider_id) where status = 'approved';

create table if not exists public.provider_photo_history (
  id bigint generated always as identity primary key,
  photo_id uuid not null references public.provider_photos(id) on delete restrict,
  from_status public.provider_photo_status,
  to_status public.provider_photo_status not null,
  actor_user_id uuid not null,
  reason text not null check (length(trim(reason)) between 10 and 1000),
  created_at timestamptz not null default now()
);

alter table public.provider_photo_upload_tickets enable row level security;
alter table public.provider_photos enable row level security;
alter table public.provider_photo_history enable row level security;
revoke all on table public.provider_photo_upload_tickets from public, anon, authenticated;
revoke all on table public.provider_photos from anon, authenticated;
revoke all on table public.provider_photo_history from anon, authenticated;
grant select, insert, delete on table public.provider_photo_upload_tickets to service_role;

drop trigger if exists touch_provider_photos_updated_at on public.provider_photos;
create trigger touch_provider_photos_updated_at
before update on public.provider_photos
for each row execute function public.touch_updated_at();

do $$ begin
  if exists (select 1 from storage.buckets where id = 'provider-photos-private') then
    raise exception 'M14 requires the provider-photos-private bucket name to be unused before migration.';
  end if;
  insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values (
    'provider-photos-private',
    'provider-photos-private',
    false,
    4194304,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  );
end $$;

drop policy if exists provider_photos_block_anon_authenticated on storage.objects;
create policy provider_photos_block_anon_authenticated
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'provider-photos-private')
with check (bucket_id <> 'provider-photos-private');

create or replace function public.submit_provider_photo(
  p_upload_ticket_id uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_ticket public.provider_photo_upload_tickets%rowtype;
  v_claim public.provider_claims%rowtype;
  v_photo_id uuid;
begin
  if v_user is null then return false; end if;
  select * into v_ticket
  from public.provider_photo_upload_tickets
  where id = p_upload_ticket_id
    and auth_user_id = v_user
    and consumed_at is null
    and expires_at > now()
  for update;
  if not found then return false; end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'provider-photos-private' and name = v_ticket.original_object_key
  ) or not exists (
    select 1 from storage.objects
    where bucket_id = 'provider-photos-private' and name = v_ticket.normalized_object_key
  ) then return false; end if;

  select c.* into v_claim
  from public.provider_claims c
  join public.provider_records p on p.id = c.provider_id
  where c.provider_id = v_ticket.provider_id
    and c.auth_user_id = v_user
    and c.status = 'approved'
    and p.status = 'active'
    and not exists (
      select 1 from public.provider_suspensions s
      where s.provider_id = p.id and s.status = 'active'
    )
  for update of c;
  if not found then return false; end if;

  insert into public.provider_photos(
    provider_id, claim_id, submitted_by, original_object_key, normalized_object_key,
    original_media_type, byte_size, width, height, content_sha256, consent_attested_at
  ) values (
    v_ticket.provider_id, v_claim.id, v_user, v_ticket.original_object_key, v_ticket.normalized_object_key,
    v_ticket.original_media_type, v_ticket.byte_size, v_ticket.width, v_ticket.height,
    v_ticket.content_sha256, now()
  ) returning id into v_photo_id;
  insert into public.provider_photo_history(photo_id, to_status, actor_user_id, reason)
  values (v_photo_id, 'pending', v_user, 'Provider submitted a normalized photo for administrator review.');
  update public.provider_photo_upload_tickets set consumed_at = now() where id = v_ticket.id;
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_moderate_provider_photo(
  p_photo_id uuid,
  p_decision text,
  p_reason text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid(); v_photo public.provider_photos%rowtype; v_previous public.provider_photos%rowtype;
begin
  if not public.is_mechanicmatch_admin()
    or p_decision not in ('approved', 'rejected')
    or length(trim(p_reason)) not between 10 and 1000
  then return false; end if;

  select * into v_photo from public.provider_photos
  where id = p_photo_id and status = 'pending' for update;
  if not found then return false; end if;
  perform 1 from public.provider_photos where provider_id = v_photo.provider_id for update;

  if p_decision = 'approved' then
    perform 1
    from public.provider_claims c
    join public.provider_records p on p.id = c.provider_id
    where c.id = v_photo.claim_id
      and c.status = 'approved'
      and p.status = 'active'
      and not exists (
        select 1 from public.provider_suspensions s
        where s.provider_id = p.id and s.status = 'active'
      )
    for update of c;
    if not found then return false; end if;
    select * into v_previous from public.provider_photos
    where provider_id = v_photo.provider_id and status = 'approved' for update;
    if found then
      update public.provider_photos
      set status = 'removed', moderated_by = v_admin, moderated_at = now(),
          moderation_reason = 'Replaced by a newly approved provider photo.', published_at = null
      where id = v_previous.id;
      insert into public.provider_photo_history(photo_id, from_status, to_status, actor_user_id, reason)
      values (v_previous.id, 'approved', 'removed', v_admin, 'Replaced by a newly approved provider photo.');
    end if;
    update public.provider_photos
    set status = 'approved', moderated_by = v_admin, moderated_at = now(),
        moderation_reason = trim(p_reason), published_at = now()
    where id = p_photo_id;
  else
    update public.provider_photos
    set status = 'rejected', moderated_by = v_admin, moderated_at = now(),
        moderation_reason = trim(p_reason), published_at = null
    where id = p_photo_id;
  end if;

  insert into public.provider_photo_history(photo_id, from_status, to_status, actor_user_id, reason)
  values (p_photo_id, 'pending', p_decision::public.provider_photo_status, v_admin, trim(p_reason));
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_remove_provider_photo(p_photo_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid();
begin
  if not public.is_mechanicmatch_admin() or length(trim(p_reason)) not between 10 and 1000
  then return false; end if;
  update public.provider_photos
  set status = 'removed', moderated_by = v_admin, moderated_at = now(),
      moderation_reason = trim(p_reason), published_at = null
  where id = p_photo_id and status = 'approved';
  if not found then return false; end if;
  insert into public.provider_photo_history(photo_id, from_status, to_status, actor_user_id, reason)
  values (p_photo_id, 'approved', 'removed', v_admin, trim(p_reason));
  return true;
end;
$$;

create or replace view public.approved_public_provider_photos with (security_barrier=true) as
select
  ph.id as photo_id,
  ph.provider_id,
  ph.width,
  ph.height,
  ph.published_at
from public.provider_photos ph
join public.provider_records p on p.id = ph.provider_id
join public.provider_claims c on c.id = ph.claim_id and c.status = 'approved'
where ph.status = 'approved'
  and ph.published_at is not null
  and p.status = 'active'
  and not exists (
    select 1 from public.provider_suspensions s
    where s.provider_id = p.id and s.status = 'active'
  );

revoke execute on function public.submit_provider_photo(uuid) from public, anon, authenticated;
revoke execute on function public.admin_moderate_provider_photo(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.admin_remove_provider_photo(uuid,text) from public, anon, authenticated;
grant execute on function public.submit_provider_photo(uuid) to authenticated;
grant execute on function public.admin_moderate_provider_photo(uuid,text,text) to authenticated;
grant execute on function public.admin_remove_provider_photo(uuid,text) to authenticated;

revoke all on table public.approved_public_provider_photos from public;
grant select on table public.approved_public_provider_photos to anon, authenticated;

comment on table public.provider_photos is 'Private original and normalized object keys plus moderation state. Object keys are never public.';
comment on table public.provider_photo_upload_tickets is 'Private short-lived server-created tickets consumed only by the matching authenticated user.';
comment on view public.approved_public_provider_photos is 'Approved photo metadata for active, non-suspended providers; excludes storage keys and ownership data.';
