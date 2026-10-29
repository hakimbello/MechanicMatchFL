-- M12: email-owned, moderated customer reviews.
-- Apply only through the authorized Supabase migration runner after review.

do $$ begin
  create type public.customer_review_status as enum ('pending-email', 'pending-moderation', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_records(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (length(trim(review_text)) between 20 and 2000),
  reviewer_display_name text check (reviewer_display_name is null or length(trim(reviewer_display_name)) between 1 and 80),
  reviewer_email text not null check (reviewer_email = lower(reviewer_email) and length(reviewer_email) <= 254 and reviewer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  reviewer_email_hash text not null check (reviewer_email_hash ~ '^[0-9a-f]{64}$'),
  status public.customer_review_status not null default 'pending-email',
  verification_token_hash text not null unique check (verification_token_hash ~ '^[0-9a-f]{64}$'),
  verification_expires_at timestamptz not null,
  verification_email_sent_at timestamptz,
  verification_delivery_id text,
  email_verified_at timestamptz,
  token_consumed_at timestamptz,
  moderated_by uuid references public.admin_users(user_id),
  moderated_at timestamptz,
  moderation_reason text check (moderation_reason is null or length(trim(moderation_reason)) between 10 and 500),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_reviews_one_email_per_provider unique (provider_id, reviewer_email),
  constraint customer_reviews_state_shape check (
    (status = 'pending-email' and email_verified_at is null and moderated_at is null and published_at is null)
    or (status = 'pending-moderation' and email_verified_at is not null and moderated_at is null and published_at is null)
    or (status = 'approved' and email_verified_at is not null and moderated_at is not null and moderated_by is not null and moderation_reason is not null and published_at is not null)
    or (status = 'rejected' and email_verified_at is not null and moderated_at is not null and moderated_by is not null and moderation_reason is not null and published_at is null)
  )
);

create table if not exists public.customer_review_submission_attempts (
  id bigint generated always as identity primary key,
  review_id uuid references public.customer_reviews(id) on delete set null,
  reviewer_email_hash text not null check (reviewer_email_hash ~ '^[0-9a-f]{64}$'),
  request_ip_hash text not null check (request_ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_review_moderation_authorizations (
  authorization_hash text primary key check (authorization_hash ~ '^[0-9a-f]{64}$'),
  admin_user_id uuid not null references public.admin_users(user_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint customer_review_moderation_authorization_lifetime check (
    expires_at > created_at and expires_at <= created_at + interval '5 minutes'
  )
);

create index if not exists customer_reviews_provider_status_idx on public.customer_reviews(provider_id, status);
create index if not exists customer_reviews_moderation_queue_idx on public.customer_reviews(created_at) where status = 'pending-moderation';
create index if not exists customer_review_attempts_email_idx on public.customer_review_submission_attempts(reviewer_email_hash, created_at);
create index if not exists customer_review_attempts_ip_idx on public.customer_review_submission_attempts(request_ip_hash, created_at);

drop trigger if exists touch_customer_reviews_updated_at on public.customer_reviews;
create trigger touch_customer_reviews_updated_at
before update on public.customer_reviews
for each row execute function public.touch_updated_at();

create or replace function public.submit_customer_review(
  p_provider_id text,
  p_rating smallint,
  p_review_text text,
  p_reviewer_email text,
  p_display_name text,
  p_email_hash text,
  p_ip_hash text,
  p_token_hash text,
  p_token_expires_at timestamptz
)
returns table(outcome text, review_id uuid, provider_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id bigint;
  v_review_id uuid;
  v_provider_name text;
  v_existing_review public.customer_reviews%rowtype;
begin
  if p_rating not between 1 and 5
    or length(trim(p_review_text)) not between 20 and 2000
    or p_reviewer_email <> lower(p_reviewer_email)
    or p_reviewer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_email_hash !~ '^[0-9a-f]{64}$'
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_token_expires_at <= now()
    or p_token_expires_at > now() + interval '31 minutes'
    or (p_display_name is not null and length(trim(p_display_name)) not between 1 and 80)
  then
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end if;

  delete from public.customer_review_submission_attempts where created_at < now() - interval '30 days';

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_email_hash, 1));

  if (select count(*) from public.customer_review_submission_attempts where request_ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.customer_review_submission_attempts where reviewer_email_hash = p_email_hash and created_at > now() - interval '24 hours') >= 3
  then
    return query select 'rate-limited'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.customer_review_submission_attempts(reviewer_email_hash, request_ip_hash)
  values (p_email_hash, p_ip_hash)
  returning id into v_attempt_id;

  select business_name into v_provider_name
  from public.provider_records
  where id = p_provider_id and status = 'active';

  if v_provider_name is null then
    return query select 'inactive-provider'::text, null::uuid, null::text;
    return;
  end if;

  select * into v_existing_review
  from public.customer_reviews
  where provider_id = p_provider_id and reviewer_email = p_reviewer_email
  for update;

  if found then
    if v_existing_review.status = 'pending-email'
      and (v_existing_review.verification_email_sent_at is null or v_existing_review.verification_expires_at <= now())
    then
      update public.customer_reviews
      set rating = p_rating,
          review_text = trim(p_review_text),
          reviewer_display_name = nullif(trim(p_display_name), ''),
          reviewer_email_hash = p_email_hash,
          verification_token_hash = p_token_hash,
          verification_expires_at = p_token_expires_at,
          verification_email_sent_at = null,
          verification_delivery_id = null,
          email_verified_at = null,
          token_consumed_at = null,
          created_at = now()
      where id = v_existing_review.id
      returning id into v_review_id;

      update public.customer_review_submission_attempts set review_id = v_review_id where id = v_attempt_id;
      return query select 'created'::text, v_review_id, v_provider_name;
      return;
    end if;

    return query select 'duplicate'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.customer_reviews(
    provider_id, rating, review_text, reviewer_display_name, reviewer_email, reviewer_email_hash,
    verification_token_hash, verification_expires_at
  ) values (
    p_provider_id, p_rating, trim(p_review_text), nullif(trim(p_display_name), ''), p_reviewer_email, p_email_hash,
    p_token_hash, p_token_expires_at
  ) returning id into v_review_id;

  update public.customer_review_submission_attempts set review_id = v_review_id where id = v_attempt_id;
  return query select 'created'::text, v_review_id, v_provider_name;
exception when unique_violation then
  return query select 'duplicate'::text, null::uuid, null::text;
end;
$$;

create or replace function public.mark_customer_review_email_sent(p_review_id uuid, p_token_hash text, p_delivery_id text)
returns boolean language sql security definer set search_path = '' as $$
  update public.customer_reviews
  set verification_email_sent_at = now(), verification_delivery_id = p_delivery_id
  where id = p_review_id and verification_token_hash = p_token_hash and status = 'pending-email' and verification_email_sent_at is null
  returning true;
$$;

create or replace function public.discard_undelivered_customer_review(p_review_id uuid, p_token_hash text)
returns boolean language sql security definer set search_path = '' as $$
  delete from public.customer_reviews
  where id = p_review_id and verification_token_hash = p_token_hash and status = 'pending-email' and verification_email_sent_at is null
  returning true;
$$;

create or replace function public.verify_customer_review_email(p_token_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_review public.customer_reviews%rowtype;
begin
  select * into v_review from public.customer_reviews where verification_token_hash = p_token_hash for update;
  if not found then return 'invalid'; end if;
  if v_review.token_consumed_at is not null or v_review.email_verified_at is not null then return 'used'; end if;
  if v_review.verification_expires_at <= now() then return 'expired'; end if;
  if v_review.verification_email_sent_at is null then return 'invalid'; end if;

  update public.customer_reviews
  set status = 'pending-moderation', email_verified_at = now(), token_consumed_at = now()
  where id = v_review.id;
  return 'verified';
end;
$$;

create or replace function public.moderate_customer_review(
  p_review_id uuid,
  p_decision text,
  p_reason text,
  p_authorization_hash text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin_id uuid;
begin
  if p_decision not in ('approved', 'rejected') or length(trim(p_reason)) not between 10 and 500 then return false; end if;

  delete from public.customer_review_moderation_authorizations where expires_at <= now();
  select admin_user_id into v_admin_id
  from public.customer_review_moderation_authorizations
  where authorization_hash = p_authorization_hash and expires_at > now()
  for update;
  if not found then return false; end if;

  delete from public.customer_review_moderation_authorizations
  where authorization_hash = p_authorization_hash;
  if not exists (select 1 from public.admin_users where user_id = v_admin_id and disabled_at is null) then return false; end if;

  update public.customer_reviews
  set status = p_decision::public.customer_review_status,
      moderated_by = v_admin_id,
      moderated_at = now(),
      moderation_reason = trim(p_reason),
      published_at = case when p_decision = 'approved' then now() else null end
  where id = p_review_id and status = 'pending-moderation' and email_verified_at is not null;
  return found;
end;
$$;

create or replace view public.approved_public_reviews
with (security_barrier = true)
as
select
  r.id,
  r.provider_id,
  r.rating,
  r.review_text,
  coalesce(nullif(r.reviewer_display_name, ''), 'Anonymous') as reviewer_name,
  true as email_verified,
  r.published_at
from public.customer_reviews r
join public.provider_records p on p.id = r.provider_id
where r.status = 'approved' and r.email_verified_at is not null and r.published_at is not null and p.status = 'active';

create or replace view public.public_provider_review_aggregates
with (security_barrier = true)
as
select provider_id, count(*)::integer as review_count, round(avg(rating)::numeric, 2) as average_rating
from public.approved_public_reviews
group by provider_id;

alter table public.customer_reviews enable row level security;
alter table public.customer_review_submission_attempts enable row level security;
alter table public.customer_review_moderation_authorizations enable row level security;

revoke all on table public.customer_reviews from anon, authenticated;
revoke all on table public.customer_review_submission_attempts from anon, authenticated;
revoke all on table public.customer_review_moderation_authorizations from anon, authenticated;
revoke all on table public.approved_public_reviews from anon, authenticated;
revoke all on table public.public_provider_review_aggregates from anon, authenticated;
grant select on table public.approved_public_reviews to anon, authenticated;
grant select on table public.public_provider_review_aggregates to anon, authenticated;

create policy "mechanicmatch admins can read customer reviews"
on public.customer_reviews for select to authenticated
using ((select public.is_mechanicmatch_admin()));

create policy "enabled admins can create bound review moderation authorizations"
on public.customer_review_moderation_authorizations for insert to authenticated
with check (
  admin_user_id = (select auth.uid())
  and (select public.is_mechanicmatch_admin())
);

grant insert (authorization_hash, admin_user_id, expires_at)
on table public.customer_review_moderation_authorizations to authenticated;

revoke execute on function public.submit_customer_review(text, smallint, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.mark_customer_review_email_sent(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.discard_undelivered_customer_review(uuid, text) from public, anon, authenticated;
revoke execute on function public.verify_customer_review_email(text) from public, anon, authenticated;
revoke execute on function public.moderate_customer_review(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_customer_review(text, smallint, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.mark_customer_review_email_sent(uuid, text, text) to service_role;
grant execute on function public.discard_undelivered_customer_review(uuid, text) to service_role;
grant execute on function public.verify_customer_review_email(text) to service_role;
grant execute on function public.moderate_customer_review(uuid, text, text, text) to service_role;

comment on table public.customer_reviews is 'Private customer reviews, reviewer identity, email verification, and moderation history.';
comment on table public.customer_review_submission_attempts is 'Private hashed abuse metadata used for durable server-side review rate limits.';
comment on table public.customer_review_moderation_authorizations is 'Private, short-lived, single-use proof binding moderation to an authenticated enabled administrator.';
comment on view public.approved_public_reviews is 'Approved reviews for active providers only. Excludes email, tokens, IP hashes, delivery data, moderation reasons, and administrator identity.';
comment on column public.approved_public_reviews.email_verified is 'Email ownership verified only; not proof of purchase, completed repair, or service relationship.';
