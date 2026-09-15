-- Keep the ROPA policies on the private RBAC implementation. The public
-- wrapper is intentionally not executable by authenticated Data API clients.

begin;

drop policy if exists "ropa links authenticated read" on public.ropa_links;
create policy "ropa links authenticated read"
on public.ropa_links
for select
to authenticated
using (
  is_active = true
  or private.is_privileged_role_impl(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "ropa links admin manage" on public.ropa_links;
create policy "ropa links admin manage"
on public.ropa_links
for all
to authenticated
using (
  private.is_privileged_role_impl(array['super_admin', 'admin']::public.user_role[])
)
with check (
  private.is_privileged_role_impl(array['super_admin', 'admin']::public.user_role[])
);

notify pgrst, 'reload schema';

commit;
