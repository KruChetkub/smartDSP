-- Deny direct PostgREST access for inactive or suspended accounts.
-- This restrictive policy is combined with every existing permissive policy,
-- so it does not grant any new access and does not affect the anon role.

begin;

-- RLS expressions execute as the authenticated caller. These helpers expose
-- only the caller's own role/permission result, so authenticated must be able
-- to execute both the public invoker wrapper and its private implementation.
grant usage on schema private to authenticated;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.is_privileged_role(public.user_role[]) from public, anon;
revoke all on function public.spd_assistant_match_role(public.user_role[]) from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_privileged_role(public.user_role[]) to authenticated;
grant execute on function public.spd_assistant_match_role(public.user_role[]) to authenticated;

grant execute on function private.current_user_role_impl() to authenticated;
grant execute on function private.has_permission_impl(text) to authenticated;
grant execute on function private.is_privileged_role_impl(public.user_role[]) to authenticated;
grant execute on function private.spd_assistant_match_role_impl(public.user_role[]) to authenticated;

do $block$
declare
  relation record;
  policy_name constant text := 'active authenticated account required';
begin
  for relation in
    select namespace.nspname as schema_name, class.relname as table_name
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind in ('r', 'p')
      and class.relrowsecurity
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_name,
      relation.schema_name,
      relation.table_name
    );

    execute format(
      'create policy %I on %I.%I as restrictive for all to authenticated using (public.current_user_role() is not null) with check (public.current_user_role() is not null)',
      policy_name,
      relation.schema_name,
      relation.table_name
    );
  end loop;
end;
$block$;

notify pgrst, 'reload schema';

commit;
