-- =========================================================
-- KPI Monitoring System
-- Supabase Auth + Profiles + RLS bootstrap
-- =========================================================
-- ใช้กับ flow:
-- - Public users: อ่านหน้า MAIN ได้โดยไม่ต้อง login
-- - Admin users: login ผ่าน Supabase Auth
-- - Admin routes: ใช้ role จาก public.profiles
-- - Database writes: จำกัดเฉพาะ admin
--
-- ตารางที่ SQL นี้รองรับ:
-- - public.profiles
-- - public.sdg_indicators
-- - public.health_indicators
--
-- หมายเหตุ:
-- 1) ถ้าระบบของคุณยังไม่มีตาราง sdg_indicators / health_indicators ให้สร้างก่อน
-- 2) SQL นี้ตั้งให้ public อ่านข้อมูลที่ is_deleted = false ได้
-- 3) admin จะอ่าน/เขียนได้ทั้งหมด รวมถึงแถวที่ soft delete แล้ว
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) PROFILES TABLE
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  office text not null default 'Central Office',
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('viewer', 'admin', 'central_office'))
);

create index if not exists profiles_role_idx on public.profiles(role);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

-- ---------------------------------------------------------
-- 2) AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text;
  new_office text;
  new_full_name text;
begin
  new_role := coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'viewer');
  new_office := coalesce(new.raw_user_meta_data ->> 'office', 'Central Office');
  new_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  insert into public.profiles (id, email, full_name, office, role)
  values (
    new.id,
    new.email,
    nullif(new_full_name, ''),
    new_office,
    case
      when new_role in ('admin', 'central_office', 'viewer') then new_role
      else 'viewer'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    office = coalesce(excluded.office, public.profiles.office),
    role = case
      when public.profiles.role in ('admin', 'central_office') then public.profiles.role
      else excluded.role
    end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 3) ADMIN HELPER FUNCTION
-- ---------------------------------------------------------
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role in ('admin', 'central_office')
  );
$$;

-- ---------------------------------------------------------
-- 4) BASIC GRANTS
-- ---------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.sdg_indicators to anon, authenticated;
grant select on public.health_indicators to anon, authenticated;
grant insert, update, delete on public.sdg_indicators to authenticated;
grant insert, update, delete on public.health_indicators to authenticated;

-- ---------------------------------------------------------
-- 5) ENABLE RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sdg_indicators enable row level security;
alter table public.health_indicators enable row level security;

-- ---------------------------------------------------------
-- 6) DROP OLD POLICIES IF THEY EXIST
-- ---------------------------------------------------------
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;

drop policy if exists "sdg_public_read_active" on public.sdg_indicators;
drop policy if exists "sdg_admin_read_all" on public.sdg_indicators;
drop policy if exists "sdg_admin_insert" on public.sdg_indicators;
drop policy if exists "sdg_admin_update" on public.sdg_indicators;
drop policy if exists "sdg_admin_delete" on public.sdg_indicators;

drop policy if exists "health_public_read_active" on public.health_indicators;
drop policy if exists "health_admin_read_all" on public.health_indicators;
drop policy if exists "health_admin_insert" on public.health_indicators;
drop policy if exists "health_admin_update" on public.health_indicators;
drop policy if exists "health_admin_delete" on public.health_indicators;

-- ---------------------------------------------------------
-- 7) PROFILES POLICIES
-- ---------------------------------------------------------
create policy "profiles_self_select"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------------------------------------------------------
-- 8) SDG INDICATORS POLICIES
-- ---------------------------------------------------------
create policy "sdg_public_read_active"
on public.sdg_indicators
for select
to anon, authenticated
using (coalesce(is_deleted, false) = false);

create policy "sdg_admin_read_all"
on public.sdg_indicators
for select
to authenticated
using (public.is_admin());

create policy "sdg_admin_insert"
on public.sdg_indicators
for insert
to authenticated
with check (public.is_admin());

create policy "sdg_admin_update"
on public.sdg_indicators
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "sdg_admin_delete"
on public.sdg_indicators
for delete
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------
-- 9) HEALTH INDICATORS POLICIES
-- ---------------------------------------------------------
create policy "health_public_read_active"
on public.health_indicators
for select
to anon, authenticated
using (coalesce(is_deleted, false) = false);

create policy "health_admin_read_all"
on public.health_indicators
for select
to authenticated
using (public.is_admin());

create policy "health_admin_insert"
on public.health_indicators
for insert
to authenticated
with check (public.is_admin());

create policy "health_admin_update"
on public.health_indicators
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "health_admin_delete"
on public.health_indicators
for delete
to authenticated
using (public.is_admin());

commit;

-- =========================================================
-- HOW TO PROMOTE AN ACCOUNT TO ADMIN
-- =========================================================
-- 1) ให้ user สมัคร/ถูกสร้างใน auth.users ก่อน
-- 2) จากนั้นรัน:
--
-- update public.profiles
-- set role = 'admin', office = 'Central Office'
-- where email = 'your-admin@email.com';
--
-- หรือใช้ 'central_office' แทน role = 'admin' ก็ได้
-- =========================================================
