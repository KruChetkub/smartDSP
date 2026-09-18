-- RLS runtime helpers must be executable by authenticated but never by anon.
-- Run after 202609180005_restore_rls_runtime_helper_execute.sql.

with expected(function_signature) as (
  values
    ('public.current_user_role()'),
    ('public.has_permission(text)'),
    ('public.is_privileged_role(public.user_role[])'),
    ('public.spd_assistant_match_role(public.user_role[])'),
    ('private.current_user_role_impl()'),
    ('private.has_permission_impl(text)'),
    ('private.is_privileged_role_impl(public.user_role[])'),
    ('private.spd_assistant_match_role_impl(public.user_role[])')
), actual as (
  select
    function_signature,
    has_function_privilege('authenticated', function_signature, 'EXECUTE') as authenticated_can_execute,
    has_function_privilege('anon', function_signature, 'EXECUTE') as anon_can_execute
  from expected
)
select *
from actual
where not authenticated_can_execute
   or anon_can_execute
order by function_signature;
