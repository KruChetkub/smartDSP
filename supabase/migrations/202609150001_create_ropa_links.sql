-- Configurable ROPA submenu links for authenticated portal users.

begin;

create table if not exists public.ropa_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 300),
  link_url text not null check (
    char_length(link_url) <= 1000
    and link_url ~* '^https?://'
  ),
  is_active boolean not null default true,
  sort_order integer not null default 10,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ropa_links_active_order
on public.ropa_links (is_active, sort_order, title);

alter table public.ropa_links enable row level security;

drop policy if exists "ropa links authenticated read" on public.ropa_links;
create policy "ropa links authenticated read"
on public.ropa_links
for select
to authenticated
using (
  is_active = true
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "ropa links admin manage" on public.ropa_links;
create policy "ropa links admin manage"
on public.ropa_links
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

create or replace function public.set_ropa_links_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ropa_links_updated_at on public.ropa_links;
create trigger set_ropa_links_updated_at
before update on public.ropa_links
for each row
execute function public.set_ropa_links_updated_at();

revoke all privileges
on function public.set_ropa_links_updated_at()
from public, anon, authenticated;

revoke all on table public.ropa_links from public, anon, authenticated;
grant select, insert, update, delete on table public.ropa_links to authenticated;
grant select, insert, update, delete on table public.ropa_links to service_role;

insert into public.ropa_links (title, description, link_url, is_active, sort_order)
select
  'Record of Processing Activities for Data Controller Form',
  'แบบบันทึกรายการประมวลผลข้อมูลส่วนบุคคลสำหรับผู้ควบคุมข้อมูลส่วนบุคคล',
  'https://docs.google.com/spreadsheets/d/1bUQ6hboYaAQacqQANjtzSegFUT4wAFoO5iuqFEJnbig/edit?usp=sharing',
  true,
  10
where not exists (
  select 1
  from public.ropa_links
  where link_url = 'https://docs.google.com/spreadsheets/d/1bUQ6hboYaAQacqQANjtzSegFUT4wAFoO5iuqFEJnbig/edit?usp=sharing'
);

notify pgrst, 'reload schema';

commit;
