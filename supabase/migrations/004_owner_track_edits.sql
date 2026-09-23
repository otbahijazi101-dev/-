-- Owners can resubmit their tracks; each edit returns to moderation.
-- The owner and storage folders cannot be changed to another user's files.
create policy "active owners can revise their tracks"
on public.tracks for update to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
)
with check (
  owner_id = (select auth.uid())
  and status = 'pending'
  and published_at is null
  and (storage.foldername(storage_path))[1] = (select auth.uid())::text
  and (cover_path is null or (storage.foldername(cover_path))[1] = (select auth.uid())::text)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
);
