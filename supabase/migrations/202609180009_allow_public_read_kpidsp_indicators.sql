-- Allow public read access to active KPI DSP indicators (SDGs and Health)
-- This enables public visitors to view KPI dashboards without logging in,
-- matching the public access model of home content and repository pages.
-- Management mutations (insert, update, delete) still strictly require
-- authenticated users with the 'kpidsp.indicators.manage' permission.

begin;

grant select on table public.sdg_indicators to anon, authenticated;
grant select on table public.health_indicators to anon, authenticated;

-- SDG indicators: Public can read active (non-deleted) indicators
drop policy if exists "kpidsp sdg active users read" on public.sdg_indicators;
drop policy if exists "kpidsp sdg public read active" on public.sdg_indicators;
create policy "kpidsp sdg public read active"
on public.sdg_indicators
for select
to anon, authenticated
using (not is_deleted);

-- SDG indicators: Managers can read soft-deleted indicators
drop policy if exists "kpidsp sdg managers read deleted" on public.sdg_indicators;
create policy "kpidsp sdg managers read deleted"
on public.sdg_indicators
for select
to authenticated
using (
  is_deleted and public.has_permission('kpidsp.indicators.manage')
);

-- Health indicators: Public can read active (non-deleted) indicators
drop policy if exists "kpidsp health active users read" on public.health_indicators;
drop policy if exists "kpidsp health public read active" on public.health_indicators;
create policy "kpidsp health public read active"
on public.health_indicators
for select
to anon, authenticated
using (not is_deleted);

-- Health indicators: Managers can read soft-deleted indicators
drop policy if exists "kpidsp health managers read deleted" on public.health_indicators;
create policy "kpidsp health managers read deleted"
on public.health_indicators
for select
to authenticated
using (
  is_deleted and public.has_permission('kpidsp.indicators.manage')
);

notify pgrst, 'reload schema';

commit;

