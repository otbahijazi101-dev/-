-- SoundPalestine initial schema
-- Apply this migration only to the dedicated SoundPalestine Supabase project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  display_name text check (display_name is null or char_length(display_name) <= 60),
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null constraint tracks_owner_id_fkey references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text check (description is null or char_length(description) <= 2000),
  category text check (category is null or char_length(category) <= 80),
  storage_path text not null unique,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 300),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tracks_status_published_at_idx on public.tracks(status, published_at desc);
create index if not exists tracks_owner_created_at_idx on public.tracks(owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.tracks from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.tracks to authenticated;

create policy "profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "published tracks are public and owners can see their tracks"
on public.tracks for select
to anon, authenticated
using (
  status = 'published'
  or owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
);

create policy "active users can submit and admins can publish"
on public.tracks for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and (
        (p.role = 'user' and status = 'pending' and published_at is null)
        or (p.role = 'admin' and status in ('pending', 'published'))
      )
  )
);

create policy "admins can update tracks"
on public.tracks for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
);

create policy "admins can delete tracks"
on public.tracks for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  false,
  52428800,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/aac','audio/flac']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "audio is readable when published or owned or admin"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'audio'
  and exists (
    select 1 from public.tracks t
    where t.storage_path = name
      and (
        t.status = 'published'
        or t.owner_id = (select auth.uid())
        or exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
        )
      )
  )
);

create policy "active users can upload to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
);

create policy "owners and admins can delete audio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'audio'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
    )
  )
);
