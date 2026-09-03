-- Global site settings for the Radio brand.

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'راديو' check (char_length(btrim(site_name)) between 1 and 80),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, site_name)
values (1, 'راديو')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists "site settings are publicly readable" on public.site_settings;
create policy "site settings are publicly readable"
on public.site_settings for select
to anon, authenticated
using (id = 1);

drop policy if exists "active admins can update site settings" on public.site_settings;
create policy "active admins can update site settings"
on public.site_settings for update
to authenticated
using (
  id = 1
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  id = 1
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'active'
  )
);
