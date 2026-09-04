grant select on public.playlists, public.playlist_items to anon, authenticated;

drop policy if exists "public can read playlists" on public.playlists;
create policy "public can read playlists"
on public.playlists
for select
to anon, authenticated
using (true);

drop policy if exists "public can read published playlist items" on public.playlist_items;
create policy "public can read published playlist items"
on public.playlist_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tracks t
    where t.id = playlist_items.track_id
      and t.status = 'published'
  )
);
