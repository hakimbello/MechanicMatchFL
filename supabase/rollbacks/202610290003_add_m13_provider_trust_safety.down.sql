-- Guarded M13 rollback. Export and explicitly authorize deletion of all M13 evidence before use.

do $$
begin
  if exists(select 1 from public.provider_claims)
    or exists(select 1 from public.provider_review_responses)
    or exists(select 1 from public.provider_review_disputes)
    or exists(select 1 from public.safety_incidents)
    or exists(select 1 from public.provider_suspensions)
    or exists(select 1 from public.provider_suspension_appeals)
  then
    raise exception 'Cannot roll back M13 while claim, response, dispute, safety, suspension, or appeal evidence exists; export it and use an explicitly approved data migration';
  end if;
end $$;

drop view if exists public.approved_public_provider_responses;

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
  years_experience,
  spoken_languages
from public.provider_records where status='active';

create or replace view public.approved_public_reviews with (security_barrier=true) as
select
  r.id,
  r.provider_id,
  r.rating,
  r.review_text,
  coalesce(nullif(r.reviewer_display_name,''),'Anonymous') as reviewer_name,
  true as email_verified,
  r.published_at
from public.customer_reviews r join public.provider_records p on p.id=r.provider_id
where r.status='approved' and r.email_verified_at is not null and r.published_at is not null and p.status='active';

drop function if exists public.admin_decide_provider_appeal(uuid,text,text);
drop function if exists public.submit_provider_suspension_appeal(text,text);
drop function if exists public.admin_reinstate_provider(text,text);
drop function if exists public.admin_suspend_provider(text,text);
drop function if exists public.admin_update_safety_incident(uuid,text,text);
drop function if exists public.submit_safety_incident(text,text,text,text,text,text,text);
drop function if exists public.admin_update_provider_dispute(uuid,text,text);
drop function if exists public.submit_provider_review_dispute(uuid,text);
drop function if exists public.admin_moderate_provider_response(uuid,text,text);
drop function if exists public.submit_provider_review_response(uuid,text);
drop function if exists public.admin_review_provider_claim(uuid,text,text);
drop function if exists public.submit_provider_claim(text,text);
drop function if exists public.has_approved_provider_claim(text);

drop table if exists public.provider_suspension_appeal_history;
drop table if exists public.provider_suspension_appeals;
drop table if exists public.provider_suspension_history;
drop table if exists public.provider_suspensions;
drop table if exists public.safety_investigation_history;
drop table if exists public.safety_incident_attempts;
drop table if exists public.safety_incidents;
drop table if exists public.provider_review_dispute_history;
drop table if exists public.provider_review_disputes;
drop table if exists public.provider_review_response_history;
drop table if exists public.provider_review_responses;
drop table if exists public.provider_claim_history;
drop table if exists public.provider_claims;

drop type if exists public.provider_appeal_status;
drop type if exists public.provider_suspension_status;
drop type if exists public.safety_incident_status;
drop type if exists public.provider_dispute_status;
drop type if exists public.trust_moderation_status;
drop type if exists public.provider_claim_status;
