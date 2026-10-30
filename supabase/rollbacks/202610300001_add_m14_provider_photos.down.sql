-- M14 guarded rollback. Export evidence and remove storage objects through an approved process first.

do $$ begin
  if exists (select 1 from public.provider_photos limit 1) then
    raise exception 'Cannot roll back M14 while provider photo records or moderation history exist. Export and explicitly remove retained evidence first.';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'provider-photos-private' limit 1) then
    raise exception 'Cannot roll back M14 while private provider photo objects exist. Reconcile and explicitly remove them first.';
  end if;
  if exists (select 1 from public.provider_photo_upload_tickets limit 1) then
    raise exception 'Cannot roll back M14 while provider photo upload tickets exist. Reconcile expired and consumed tickets first.';
  end if;
end $$;

drop view if exists public.approved_public_provider_photos;

drop function if exists public.admin_remove_provider_photo(uuid,text);
drop function if exists public.admin_moderate_provider_photo(uuid,text,text);
drop function if exists public.submit_provider_photo(uuid);

drop policy if exists provider_photos_block_anon_authenticated on storage.objects;
drop trigger if exists touch_provider_photos_updated_at on public.provider_photos;
drop table if exists public.provider_photo_history;
drop table if exists public.provider_photos;
drop table if exists public.provider_photo_upload_tickets;
delete from storage.buckets where id = 'provider-photos-private';
drop type if exists public.provider_photo_status;
