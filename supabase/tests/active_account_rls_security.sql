-- Every public table protected by RLS must also reject inactive authenticated accounts.
-- Run after applying 202609180004_require_active_account_for_authenticated_rls.sql.

with rls_tables as (
  select class.oid as table_oid, namespace.nspname as schema_name, class.relname as table_name
  from pg_class as class
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relkind in ('r', 'p')
    and class.relrowsecurity
), missing_guard as (
  select rls_tables.schema_name, rls_tables.table_name
  from rls_tables
  where not exists (
    select 1
    from pg_policy as policy
    where policy.polrelid = rls_tables.table_oid
      and policy.polname = 'active authenticated account required'
      and not policy.polpermissive
      and policy.polroles = array[(select oid from pg_roles where rolname = 'authenticated')]
      and pg_get_expr(policy.polqual, policy.polrelid) like '%current_user_role()%IS NOT NULL%'
      and pg_get_expr(policy.polwithcheck, policy.polrelid) like '%current_user_role()%IS NOT NULL%'
  )
)
select *
from missing_guard
order by schema_name, table_name;
