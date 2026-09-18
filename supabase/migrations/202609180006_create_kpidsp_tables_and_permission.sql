-- Integrate KPI DSP into SmartDSP without importing the standalone KPI auth model.
-- Dashboards are available to active SmartDSP users; mutations require the
-- kpidsp.indicators.manage supplemental permission.

begin;

create table if not exists public.sdg_indicators (
  id uuid primary key default gen_random_uuid(),
  indicator_name text not null check (char_length(btrim(indicator_name)) between 1 and 1000),
  category text,
  target_2030 text,
  current_performance text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete set null default auth.uid(),
  is_deleted boolean not null default false,
  fiscal_year text not null default '2569' check (char_length(btrim(fiscal_year)) between 1 and 20),
  period text not null default 'Q4' check (char_length(btrim(period)) between 1 and 30),
  reference_url text,
  constraint sdg_indicators_reference_url_http
    check (reference_url is null or reference_url ~* '^https?://')
);

create table if not exists public.health_indicators (
  id uuid primary key default gen_random_uuid(),
  indicator_name text not null check (char_length(btrim(indicator_name)) between 1 and 1000),
  kpi_group text,
  region text,
  a_value text,
  b_value text,
  performance text,
  target_q1 text,
  target_q2 text,
  target_q3 text,
  target_q4 text,
  is_type_a boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete set null default auth.uid(),
  is_deleted boolean not null default false,
  fiscal_year text not null default '2569' check (char_length(btrim(fiscal_year)) between 1 and 20),
  period text not null default 'Q4' check (char_length(btrim(period)) between 1 and 30),
  reference_url text,
  evaluation_direction text not null default 'higher_is_better'
    check (evaluation_direction in ('higher_is_better', 'lower_is_better')),
  constraint health_indicators_reference_url_http
    check (reference_url is null or reference_url ~* '^https?://')
);

create index if not exists idx_sdg_indicators_active_period
on public.sdg_indicators(is_deleted, fiscal_year, period);

create index if not exists idx_health_indicators_active_period
on public.health_indicators(is_deleted, fiscal_year, period);

create index if not exists idx_health_indicators_region
on public.health_indicators(region);

-- Keep this migration self-contained. Some linked databases were created
-- before the shared public.set_updated_at() helper was introduced.
create or replace function public.kpidsp_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.kpidsp_set_updated_at() from public, anon, authenticated;

drop trigger if exists set_sdg_indicators_updated_at on public.sdg_indicators;
create trigger set_sdg_indicators_updated_at
before update on public.sdg_indicators
for each row execute function public.kpidsp_set_updated_at();

drop trigger if exists set_health_indicators_updated_at on public.health_indicators;
create trigger set_health_indicators_updated_at
before update on public.health_indicators
for each row execute function public.kpidsp_set_updated_at();

insert into public.permissions (permission_key, label, module)
values (
  'kpidsp.indicators.manage',
  'ผู้บันทึกรายงานตัวชี้วัด',
  'kpidsp'
)
on conflict (permission_key) do update
set label = excluded.label,
    module = excluded.module;

insert into public.role_permissions (role, permission_key)
values ('super_admin', 'kpidsp.indicators.manage')
on conflict (role, permission_key) do nothing;

create or replace function public.revoke_personnel_only_permissions_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'personnel'::public.user_role
     and new.role <> 'personnel'::public.user_role then
    delete from public.user_permission_overrides
    where user_id = new.user_id
      and permission_key in (
        'budget_utilization.items.manage',
        'kpidsp.indicators.manage'
      );
  end if;
  return new;
end;
$$;

revoke all on function public.revoke_personnel_only_permissions_on_role_change() from public, anon, authenticated;

drop trigger if exists revoke_personnel_only_permissions_on_role_change on public.profiles;
create trigger revoke_personnel_only_permissions_on_role_change
after update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute function public.revoke_personnel_only_permissions_on_role_change();

alter table public.sdg_indicators enable row level security;
alter table public.health_indicators enable row level security;

drop policy if exists "kpidsp sdg active users read" on public.sdg_indicators;
create policy "kpidsp sdg active users read"
on public.sdg_indicators
for select
to authenticated
using (
  public.current_user_role() is not null
  and (not is_deleted or public.has_permission('kpidsp.indicators.manage'))
);

drop policy if exists "kpidsp sdg managers insert" on public.sdg_indicators;
create policy "kpidsp sdg managers insert"
on public.sdg_indicators
for insert
to authenticated
with check (
  public.has_permission('kpidsp.indicators.manage')
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "kpidsp sdg managers update" on public.sdg_indicators;
create policy "kpidsp sdg managers update"
on public.sdg_indicators
for update
to authenticated
using (public.has_permission('kpidsp.indicators.manage'))
with check (
  public.has_permission('kpidsp.indicators.manage')
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "kpidsp sdg managers delete" on public.sdg_indicators;
create policy "kpidsp sdg managers delete"
on public.sdg_indicators
for delete
to authenticated
using (public.has_permission('kpidsp.indicators.manage'));

drop policy if exists "kpidsp health active users read" on public.health_indicators;
create policy "kpidsp health active users read"
on public.health_indicators
for select
to authenticated
using (
  public.current_user_role() is not null
  and (not is_deleted or public.has_permission('kpidsp.indicators.manage'))
);

drop policy if exists "kpidsp health managers insert" on public.health_indicators;
create policy "kpidsp health managers insert"
on public.health_indicators
for insert
to authenticated
with check (
  public.has_permission('kpidsp.indicators.manage')
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "kpidsp health managers update" on public.health_indicators;
create policy "kpidsp health managers update"
on public.health_indicators
for update
to authenticated
using (public.has_permission('kpidsp.indicators.manage'))
with check (
  public.has_permission('kpidsp.indicators.manage')
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "kpidsp health managers delete" on public.health_indicators;
create policy "kpidsp health managers delete"
on public.health_indicators
for delete
to authenticated
using (public.has_permission('kpidsp.indicators.manage'));

revoke all on table public.sdg_indicators from public, anon, authenticated;
revoke all on table public.health_indicators from public, anon, authenticated;
grant select, insert, update, delete on table public.sdg_indicators to authenticated;
grant select, insert, update, delete on table public.health_indicators to authenticated;

notify pgrst, 'reload schema';

commit;
