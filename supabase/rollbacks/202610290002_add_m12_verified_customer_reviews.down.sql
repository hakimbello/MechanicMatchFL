-- Guarded M12 rollback. Promote to a new timestamped migration after review.
-- Export and explicitly authorize deletion of review data before retrying.

do $$
begin
  if exists (select 1 from public.customer_reviews) then
    raise exception 'Cannot roll back M12 while customer reviews exist; export and remove them through an explicitly approved data migration first';
  end if;
end $$;

drop view if exists public.public_provider_review_aggregates;
drop view if exists public.approved_public_reviews;
drop function if exists public.moderate_customer_review(uuid, text, text, text);
drop function if exists public.verify_customer_review_email(text);
drop function if exists public.discard_undelivered_customer_review(uuid, text);
drop function if exists public.mark_customer_review_email_sent(uuid, text, text);
drop function if exists public.submit_customer_review(text, smallint, text, text, text, text, text, text, timestamptz);
drop table if exists public.customer_review_moderation_authorizations;
drop table if exists public.customer_review_submission_attempts;
drop table if exists public.customer_reviews;
drop type if exists public.customer_review_status;
