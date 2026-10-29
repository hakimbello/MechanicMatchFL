-- M13: administrator-approved provider identity, moderated responses, disputes, and private safety operations.
-- Apply only after independent review. No provider claim is self-approving.

do $$ begin create type public.provider_claim_status as enum ('pending', 'approved', 'rejected', 'disabled', 'revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.trust_moderation_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_dispute_status as enum ('open', 'reviewing', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.safety_incident_status as enum ('new', 'investigating', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_suspension_status as enum ('active', 'reinstated'); exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_appeal_status as enum ('pending', 'granted', 'upheld', 'closed'); exception when duplicate_object then null; end $$;

create table if not exists public.provider_claims (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_records(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status public.provider_claim_status not null default 'pending',
  evidence text not null check (length(trim(evidence)) between 30 and 2000),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.admin_users(user_id),
  reviewed_at timestamptz,
  review_reason text check (review_reason is null or length(trim(review_reason)) between 10 and 1000),
  updated_at timestamptz not null default now(),
  constraint provider_claim_review_shape check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and review_reason is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null and review_reason is not null)
  )
);

create unique index if not exists provider_claims_one_current_request_idx
on public.provider_claims(provider_id, auth_user_id) where status in ('pending', 'approved');
create unique index if not exists provider_claims_one_approved_owner_idx
on public.provider_claims(provider_id) where status = 'approved';

create table if not exists public.provider_claim_history (
  id bigint generated always as identity primary key,
  claim_id uuid not null references public.provider_claims(id) on delete restrict,
  from_status public.provider_claim_status,
  to_status public.provider_claim_status not null,
  actor_user_id uuid not null,
  reason text not null check (length(trim(reason)) between 10 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_review_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.customer_reviews(id) on delete restrict,
  provider_id text not null references public.provider_records(id) on delete restrict,
  claim_id uuid not null references public.provider_claims(id) on delete restrict,
  response_text text not null check (length(trim(response_text)) between 10 and 1000),
  status public.trust_moderation_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  moderated_by uuid references public.admin_users(user_id),
  moderated_at timestamptz,
  moderation_reason text check (moderation_reason is null or length(trim(moderation_reason)) between 10 and 1000),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint provider_response_moderation_shape check (
    (status = 'pending' and moderated_by is null and moderated_at is null and moderation_reason is null and published_at is null)
    or (status = 'approved' and moderated_by is not null and moderated_at is not null and moderation_reason is not null and published_at is not null)
    or (status = 'rejected' and moderated_by is not null and moderated_at is not null and moderation_reason is not null and published_at is null)
  )
);

create table if not exists public.provider_review_response_history (
  id bigint generated always as identity primary key,
  response_id uuid not null references public.provider_review_responses(id) on delete restrict,
  response_text text not null check (length(trim(response_text)) between 10 and 1000),
  status public.trust_moderation_status not null,
  actor_user_id uuid not null,
  action text not null check (action in ('submitted', 'edited', 'approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_review_disputes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.customer_reviews(id) on delete restrict,
  provider_id text not null references public.provider_records(id) on delete restrict,
  claim_id uuid not null references public.provider_claims(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 20 and 2000),
  status public.provider_dispute_status not null default 'open',
  decided_by uuid references public.admin_users(user_id),
  decision_reason text check (decision_reason is null or length(trim(decision_reason)) between 10 and 2000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists provider_review_disputes_one_open_idx
on public.provider_review_disputes(review_id, provider_id) where status in ('open', 'reviewing');

create table if not exists public.provider_review_dispute_history (
  id bigint generated always as identity primary key,
  dispute_id uuid not null references public.provider_review_disputes(id) on delete restrict,
  status public.provider_dispute_status not null,
  actor_user_id uuid not null,
  note text not null check (length(trim(note)) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  provider_id text references public.provider_records(id) on delete restrict,
  category text not null check (category in ('unsafe-work', 'harassment', 'fraud', 'identity', 'other')),
  description text not null check (length(trim(description)) between 40 and 4000),
  reporter_name text check (reporter_name is null or length(trim(reporter_name)) between 1 and 100),
  reporter_email text check (reporter_email is null or (reporter_email = lower(reporter_email) and length(reporter_email) <= 254 and reporter_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  reporter_email_hash text not null check (reporter_email_hash ~ '^[0-9a-f]{64}$'),
  request_ip_hash text not null check (request_ip_hash ~ '^[0-9a-f]{64}$'),
  status public.safety_incident_status not null default 'new',
  assigned_admin_id uuid references public.admin_users(user_id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_incident_attempts (
  id bigint generated always as identity primary key,
  request_ip_hash text not null check (request_ip_hash ~ '^[0-9a-f]{64}$'),
  reporter_email_hash text not null check (reporter_email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.safety_investigation_history (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.safety_incidents(id) on delete restrict,
  status public.safety_incident_status not null,
  admin_user_id uuid not null references public.admin_users(user_id),
  note text not null check (length(trim(note)) between 10 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_suspensions (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_records(id) on delete restrict,
  status public.provider_suspension_status not null default 'active',
  reason text not null check (length(trim(reason)) between 20 and 2000),
  suspended_by uuid not null references public.admin_users(user_id),
  created_at timestamptz not null default now(),
  reinstated_by uuid references public.admin_users(user_id),
  reinstatement_reason text check (reinstatement_reason is null or length(trim(reinstatement_reason)) between 20 and 2000),
  reinstated_at timestamptz,
  constraint provider_suspension_reinstatement_shape check (
    (status = 'active' and reinstated_by is null and reinstatement_reason is null and reinstated_at is null)
    or (status = 'reinstated' and reinstated_by is not null and reinstatement_reason is not null and reinstated_at is not null)
  )
);
create unique index if not exists provider_suspensions_one_active_idx on public.provider_suspensions(provider_id) where status = 'active';

create table if not exists public.provider_suspension_history (
  id bigint generated always as identity primary key,
  suspension_id uuid not null references public.provider_suspensions(id) on delete restrict,
  action text not null check (action in ('suspended', 'reinstated')),
  admin_user_id uuid not null references public.admin_users(user_id),
  reason text not null check (length(trim(reason)) between 20 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_suspension_appeals (
  id uuid primary key default gen_random_uuid(),
  suspension_id uuid not null references public.provider_suspensions(id) on delete restrict,
  provider_id text not null references public.provider_records(id) on delete restrict,
  claim_id uuid not null references public.provider_claims(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 20 and 2000),
  status public.provider_appeal_status not null default 'pending',
  decided_by uuid references public.admin_users(user_id),
  decision_reason text check (decision_reason is null or length(trim(decision_reason)) between 20 and 2000),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists provider_suspension_appeals_one_pending_idx on public.provider_suspension_appeals(suspension_id) where status = 'pending';

create table if not exists public.provider_suspension_appeal_history (
  id bigint generated always as identity primary key,
  appeal_id uuid not null references public.provider_suspension_appeals(id) on delete restrict,
  status public.provider_appeal_status not null,
  actor_user_id uuid not null,
  note text not null check (length(trim(note)) between 20 and 2000),
  created_at timestamptz not null default now()
);

alter table public.provider_claims enable row level security;
alter table public.provider_claim_history enable row level security;
alter table public.provider_review_responses enable row level security;
alter table public.provider_review_response_history enable row level security;
alter table public.provider_review_disputes enable row level security;
alter table public.provider_review_dispute_history enable row level security;
alter table public.safety_incidents enable row level security;
alter table public.safety_incident_attempts enable row level security;
alter table public.safety_investigation_history enable row level security;
alter table public.provider_suspensions enable row level security;
alter table public.provider_suspension_history enable row level security;
alter table public.provider_suspension_appeals enable row level security;
alter table public.provider_suspension_appeal_history enable row level security;

revoke all on table public.provider_claims from anon, authenticated;
revoke all on table public.provider_claim_history from anon, authenticated;
revoke all on table public.provider_review_responses from anon, authenticated;
revoke all on table public.provider_review_response_history from anon, authenticated;
revoke all on table public.provider_review_disputes from anon, authenticated;
revoke all on table public.provider_review_dispute_history from anon, authenticated;
revoke all on table public.safety_incidents from anon, authenticated;
revoke all on table public.safety_incident_attempts from anon, authenticated;
revoke all on table public.safety_investigation_history from anon, authenticated;
revoke all on table public.provider_suspensions from anon, authenticated;
revoke all on table public.provider_suspension_history from anon, authenticated;
revoke all on table public.provider_suspension_appeals from anon, authenticated;
revoke all on table public.provider_suspension_appeal_history from anon, authenticated;

drop trigger if exists touch_provider_claims_updated_at on public.provider_claims;
create trigger touch_provider_claims_updated_at before update on public.provider_claims for each row execute function public.touch_updated_at();
drop trigger if exists touch_provider_review_responses_updated_at on public.provider_review_responses;
create trigger touch_provider_review_responses_updated_at before update on public.provider_review_responses for each row execute function public.touch_updated_at();
drop trigger if exists touch_provider_review_disputes_updated_at on public.provider_review_disputes;
create trigger touch_provider_review_disputes_updated_at before update on public.provider_review_disputes for each row execute function public.touch_updated_at();
drop trigger if exists touch_safety_incidents_updated_at on public.safety_incidents;
create trigger touch_safety_incidents_updated_at before update on public.safety_incidents for each row execute function public.touch_updated_at();

create or replace function public.has_approved_provider_claim(p_provider_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.provider_claims c
    join public.provider_records p on p.id = c.provider_id
    where c.provider_id = p_provider_id and c.auth_user_id = (select auth.uid())
      and c.status = 'approved' and p.status = 'active'
      and not exists (select 1 from public.provider_suspensions s where s.provider_id = p.id and s.status = 'active')
  );
$$;

create or replace function public.submit_provider_claim(p_provider_id text, p_evidence text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_claim_id uuid;
begin
  if v_user_id is null or length(trim(p_evidence)) not between 30 and 2000 then return false; end if;
  if not exists (select 1 from public.provider_records where id = p_provider_id and status = 'active') then return false; end if;
  if exists (select 1 from public.provider_claims where provider_id = p_provider_id and (auth_user_id = v_user_id or status = 'approved') and status in ('pending','approved')) then return false; end if;
  insert into public.provider_claims(provider_id, auth_user_id, evidence) values (p_provider_id, v_user_id, trim(p_evidence)) returning id into v_claim_id;
  insert into public.provider_claim_history(claim_id, to_status, actor_user_id, reason) values (v_claim_id, 'pending', v_user_id, 'Provider submitted ownership evidence for administrator review.');
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_review_provider_claim(p_claim_id uuid, p_decision text, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid(); v_claim public.provider_claims%rowtype;
begin
  if not public.is_mechanicmatch_admin() or p_decision not in ('approved','rejected','disabled','revoked') or length(trim(p_reason)) not between 10 and 1000 then return false; end if;
  select * into v_claim from public.provider_claims where id = p_claim_id for update;
  if not found then return false; end if;
  if p_decision in ('approved','rejected') and v_claim.status <> 'pending' then return false; end if;
  if p_decision in ('disabled','revoked') and v_claim.status <> 'approved' then return false; end if;
  update public.provider_claims set status = p_decision::public.provider_claim_status, reviewed_by = v_admin, reviewed_at = now(), review_reason = trim(p_reason) where id = p_claim_id;
  insert into public.provider_claim_history(claim_id, from_status, to_status, actor_user_id, reason) values (p_claim_id, v_claim.status, p_decision::public.provider_claim_status, v_admin, trim(p_reason));
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.submit_provider_review_response(p_review_id uuid, p_response_text text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_review public.customer_reviews%rowtype; v_claim public.provider_claims%rowtype; v_response_id uuid; v_existing public.provider_review_responses%rowtype;
begin
  if v_user is null or length(trim(p_response_text)) not between 10 and 1000 then return false; end if;
  select * into v_review from public.customer_reviews where id = p_review_id and status = 'approved' and published_at is not null for update;
  if not found or not public.has_approved_provider_claim(v_review.provider_id) then return false; end if;
  select * into v_claim from public.provider_claims where provider_id = v_review.provider_id and auth_user_id = v_user and status = 'approved';
  select * into v_existing from public.provider_review_responses where review_id = p_review_id for update;
  if found then
    update public.provider_review_responses set claim_id = v_claim.id, response_text = trim(p_response_text), status = 'pending', submitted_at = now(), moderated_by = null, moderated_at = null, moderation_reason = null, published_at = null where id = v_existing.id returning id into v_response_id;
    insert into public.provider_review_response_history(response_id,response_text,status,actor_user_id,action) values (v_response_id,trim(p_response_text),'pending',v_user,'edited');
  else
    insert into public.provider_review_responses(review_id,provider_id,claim_id,response_text) values (p_review_id,v_review.provider_id,v_claim.id,trim(p_response_text)) returning id into v_response_id;
    insert into public.provider_review_response_history(response_id,response_text,status,actor_user_id,action) values (v_response_id,trim(p_response_text),'pending',v_user,'submitted');
  end if;
  return true;
end;
$$;

create or replace function public.admin_moderate_provider_response(p_response_id uuid, p_decision text, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid(); v_response public.provider_review_responses%rowtype;
begin
  if not public.is_mechanicmatch_admin() or p_decision not in ('approved','rejected') or length(trim(p_reason)) not between 10 and 1000 then return false; end if;
  select * into v_response from public.provider_review_responses where id = p_response_id and status = 'pending' for update;
  if not found then return false; end if;
  update public.provider_review_responses set status=p_decision::public.trust_moderation_status,moderated_by=v_admin,moderated_at=now(),moderation_reason=trim(p_reason),published_at=case when p_decision='approved' then now() else null end where id=p_response_id;
  insert into public.provider_review_response_history(response_id,response_text,status,actor_user_id,action,reason) values (p_response_id,v_response.response_text,p_decision::public.trust_moderation_status,v_admin,p_decision,trim(p_reason));
  return true;
end;
$$;

create or replace function public.submit_provider_review_dispute(p_review_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_review public.customer_reviews%rowtype; v_claim public.provider_claims%rowtype; v_id uuid;
begin
  if v_user is null or length(trim(p_reason)) not between 20 and 2000 then return false; end if;
  select * into v_review from public.customer_reviews where id=p_review_id and status='approved';
  if not found or not public.has_approved_provider_claim(v_review.provider_id) then return false; end if;
  select * into v_claim from public.provider_claims where provider_id=v_review.provider_id and auth_user_id=v_user and status='approved';
  insert into public.provider_review_disputes(review_id,provider_id,claim_id,reason) values (p_review_id,v_review.provider_id,v_claim.id,trim(p_reason)) returning id into v_id;
  insert into public.provider_review_dispute_history(dispute_id,status,actor_user_id,note) values (v_id,'open',v_user,trim(p_reason));
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_update_provider_dispute(p_dispute_id uuid, p_status text, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid();
begin
  if not public.is_mechanicmatch_admin() or p_status not in ('reviewing','resolved','dismissed') or length(trim(p_reason)) not between 10 and 2000 then return false; end if;
  update public.provider_review_disputes set status=p_status::public.provider_dispute_status,decided_by=v_admin,decision_reason=trim(p_reason),decided_at=case when p_status in ('resolved','dismissed') then now() else null end where id=p_dispute_id and status in ('open','reviewing');
  if not found then return false; end if;
  insert into public.provider_review_dispute_history(dispute_id,status,actor_user_id,note) values (p_dispute_id,p_status::public.provider_dispute_status,v_admin,trim(p_reason));
  return true;
end;
$$;

create or replace function public.submit_safety_incident(p_provider_id text,p_category text,p_description text,p_reporter_name text,p_reporter_email text,p_ip_hash text,p_email_hash text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if p_category not in ('unsafe-work','harassment','fraud','identity','other') or length(trim(p_description)) not between 40 and 4000 or p_ip_hash !~ '^[0-9a-f]{64}$' or p_email_hash !~ '^[0-9a-f]{64}$' or (p_reporter_name is not null and length(trim(p_reporter_name)) not between 1 and 100) or (p_reporter_email is not null and (lower(trim(p_reporter_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(trim(p_reporter_email)) > 254)) or (p_provider_id is not null and not exists(select 1 from public.provider_records where id=p_provider_id)) then return 'invalid'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 13));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_email_hash, 14));
  if (select count(*) from public.safety_incident_attempts where request_ip_hash=p_ip_hash and created_at>now()-interval '1 hour') >= 3 or (select count(*) from public.safety_incident_attempts where reporter_email_hash=p_email_hash and created_at>now()-interval '24 hours') >= 2 then return 'rate-limited'; end if;
  insert into public.safety_incident_attempts(request_ip_hash,reporter_email_hash) values (p_ip_hash,p_email_hash);
  insert into public.safety_incidents(provider_id,category,description,reporter_name,reporter_email,request_ip_hash,reporter_email_hash) values (p_provider_id,p_category,trim(p_description),nullif(trim(p_reporter_name),''),nullif(lower(trim(p_reporter_email)),''),p_ip_hash,p_email_hash);
  return 'created';
end;
$$;

create or replace function public.admin_update_safety_incident(p_incident_id uuid,p_status text,p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid();
begin
  if not public.is_mechanicmatch_admin() or p_status not in ('investigating','resolved','dismissed') or length(trim(p_note)) not between 10 and 4000 then return false; end if;
  update public.safety_incidents set status=p_status::public.safety_incident_status,assigned_admin_id=v_admin,resolved_at=case when p_status in ('resolved','dismissed') then now() else null end where id=p_incident_id;
  if not found then return false; end if;
  insert into public.safety_investigation_history(incident_id,status,admin_user_id,note) values (p_incident_id,p_status::public.safety_incident_status,v_admin,trim(p_note));
  return true;
end;
$$;

create or replace function public.admin_suspend_provider(p_provider_id text,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid:=auth.uid(); v_id uuid;
begin
  if not public.is_mechanicmatch_admin() or length(trim(p_reason)) not between 20 and 2000 or not exists(select 1 from public.provider_records where id=p_provider_id and status='active') then return false; end if;
  insert into public.provider_suspensions(provider_id,reason,suspended_by) values(p_provider_id,trim(p_reason),v_admin) returning id into v_id;
  insert into public.provider_suspension_history(suspension_id,action,admin_user_id,reason) values(v_id,'suspended',v_admin,trim(p_reason));
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_reinstate_provider(p_provider_id text,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid:=auth.uid(); v_id uuid;
begin
  if not public.is_mechanicmatch_admin() or length(trim(p_reason)) not between 20 and 2000 then return false; end if;
  update public.provider_suspensions set status='reinstated',reinstated_by=v_admin,reinstatement_reason=trim(p_reason),reinstated_at=now() where provider_id=p_provider_id and status='active' returning id into v_id;
  if v_id is null then return false; end if;
  insert into public.provider_suspension_history(suspension_id,action,admin_user_id,reason) values(v_id,'reinstated',v_admin,trim(p_reason));
  return true;
end;
$$;

create or replace function public.submit_provider_suspension_appeal(p_provider_id text,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_claim public.provider_claims%rowtype; v_suspension public.provider_suspensions%rowtype; v_id uuid;
begin
  if v_user is null or length(trim(p_reason)) not between 20 and 2000 then return false; end if;
  select * into v_claim from public.provider_claims where provider_id=p_provider_id and auth_user_id=v_user and status='approved';
  select * into v_suspension from public.provider_suspensions where provider_id=p_provider_id and status='active';
  if v_claim.id is null or v_suspension.id is null then return false; end if;
  insert into public.provider_suspension_appeals(suspension_id,provider_id,claim_id,reason) values(v_suspension.id,p_provider_id,v_claim.id,trim(p_reason)) returning id into v_id;
  insert into public.provider_suspension_appeal_history(appeal_id,status,actor_user_id,note) values(v_id,'pending',v_user,trim(p_reason));
  return true;
exception when unique_violation then return false;
end;
$$;

create or replace function public.admin_decide_provider_appeal(p_appeal_id uuid,p_decision text,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_admin uuid:=auth.uid(); v_appeal public.provider_suspension_appeals%rowtype;
begin
  if not public.is_mechanicmatch_admin() or p_decision not in ('granted','upheld','closed') or length(trim(p_reason)) not between 20 and 2000 then return false; end if;
  select * into v_appeal from public.provider_suspension_appeals where id=p_appeal_id and status='pending' for update;
  if not found then return false; end if;
  update public.provider_suspension_appeals set status=p_decision::public.provider_appeal_status,decided_by=v_admin,decision_reason=trim(p_reason),decided_at=now() where id=p_appeal_id;
  insert into public.provider_suspension_appeal_history(appeal_id,status,actor_user_id,note) values(p_appeal_id,p_decision::public.provider_appeal_status,v_admin,trim(p_reason));
  if p_decision='granted' then perform public.admin_reinstate_provider(v_appeal.provider_id,trim(p_reason)); end if;
  return true;
end;
$$;

create or replace view public.active_public_providers as
select p.id,p.business_name as name,p.provider_type,'active'::public.provider_status as status,p.location_kind,p.phone,p.email,p.website,p.services,p.all_makes,p.makes_serviced,p.specialty_makes,p.street,p.city,p.county,p.zip,p.latitude,p.longitude,p.service_zip_codes,p.service_counties,p.service_base_zip,p.service_radius_miles,p.service_base_latitude,p.service_base_longitude,p.description,
  exists(select 1 from public.provider_claims c where c.provider_id=p.id and c.status='approved') as claimed_profile,
  false as verified,null::timestamptz as verified_at,p.years_experience,p.spoken_languages
from public.provider_records p
where p.status='active' and not exists(select 1 from public.provider_suspensions s where s.provider_id=p.id and s.status='active');

create or replace view public.approved_public_reviews with (security_barrier=true) as
select r.id,r.provider_id,r.rating,r.review_text,coalesce(nullif(r.reviewer_display_name,''),'Anonymous') as reviewer_name,true as email_verified,r.published_at
from public.customer_reviews r
join public.provider_records p on p.id=r.provider_id
where r.status='approved' and r.email_verified_at is not null and r.published_at is not null and p.status='active'
  and not exists(select 1 from public.provider_suspensions s where s.provider_id=p.id and s.status='active');

create or replace view public.approved_public_provider_responses with (security_barrier=true) as
select pr.review_id,pr.provider_id,pr.response_text,pr.published_at
from public.provider_review_responses pr
join public.customer_reviews r on r.id=pr.review_id
join public.provider_claims c on c.id=pr.claim_id
join public.provider_records p on p.id=pr.provider_id
where pr.status='approved' and pr.published_at is not null and r.status='approved' and r.published_at is not null
  and c.status='approved' and p.status='active'
  and not exists(select 1 from public.provider_suspensions s where s.provider_id=p.id and s.status='active');

revoke all on table public.active_public_providers from anon,authenticated;
grant select on table public.active_public_providers to anon,authenticated;
revoke all on table public.approved_public_reviews from anon,authenticated;
grant select on table public.approved_public_reviews to anon,authenticated;
revoke all on table public.approved_public_provider_responses from anon,authenticated;
grant select on table public.approved_public_provider_responses to anon,authenticated;

revoke execute on function public.has_approved_provider_claim(text) from public, anon, authenticated;
revoke execute on function public.submit_provider_claim(text,text) from public, anon, authenticated;
revoke execute on function public.admin_review_provider_claim(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.submit_provider_review_response(uuid,text) from public, anon, authenticated;
revoke execute on function public.admin_moderate_provider_response(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.submit_provider_review_dispute(uuid,text) from public, anon, authenticated;
revoke execute on function public.admin_update_provider_dispute(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.submit_safety_incident(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.admin_update_safety_incident(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.admin_suspend_provider(text,text) from public, anon, authenticated;
revoke execute on function public.admin_reinstate_provider(text,text) from public, anon, authenticated;
revoke execute on function public.submit_provider_suspension_appeal(text,text) from public, anon, authenticated;
revoke execute on function public.admin_decide_provider_appeal(uuid,text,text) from public, anon, authenticated;

grant execute on function public.has_approved_provider_claim(text) to authenticated;
grant execute on function public.submit_provider_claim(text,text) to authenticated;
grant execute on function public.submit_provider_review_response(uuid,text) to authenticated;
grant execute on function public.submit_provider_review_dispute(uuid,text) to authenticated;
grant execute on function public.submit_provider_suspension_appeal(text,text) to authenticated;
grant execute on function public.admin_review_provider_claim(uuid,text,text) to authenticated;
grant execute on function public.admin_moderate_provider_response(uuid,text,text) to authenticated;
grant execute on function public.admin_update_provider_dispute(uuid,text,text) to authenticated;
grant execute on function public.admin_update_safety_incident(uuid,text,text) to authenticated;
grant execute on function public.admin_suspend_provider(text,text) to authenticated;
grant execute on function public.admin_reinstate_provider(text,text) to authenticated;
grant execute on function public.admin_decide_provider_appeal(uuid,text,text) to authenticated;
grant execute on function public.submit_safety_incident(text,text,text,text,text,text,text) to service_role;

comment on table public.provider_claims is 'Private administrator-reviewed provider ownership claims bound to Supabase Auth user IDs.';
comment on table public.provider_review_disputes is 'Private provider disputes; filing never changes review publication state.';
comment on table public.safety_incidents is 'Confidential safety reports including reporter contact and abuse metadata; never a public source.';
comment on table public.provider_suspensions is 'Administrator-controlled suspension overlay. Public projections exclude active suspensions without deleting evidence.';
comment on view public.approved_public_reviews is 'Approved reviews for active, non-suspended providers only; excludes identities, disputes, and safety data.';
comment on view public.approved_public_provider_responses is 'One approved current response per approved review for an actively claimed, active, non-suspended provider.';
