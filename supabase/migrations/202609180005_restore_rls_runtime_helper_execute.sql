-- Hotfix: RLS policies call these SECURITY INVOKER wrappers as the logged-in
-- user. Migration 202609070011 removed their EXECUTE privilege, which caused
-- `permission denied for function current_user_role` once the global active
-- account guard was enabled.

begin;

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

notify pgrst, 'reload schema';

commit;
