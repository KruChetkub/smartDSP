-- Static contract for the audited user-deletion path.
-- Run after applying 202609180003_harden_user_deletion_audit.sql.

do $block$
declare
  public_function oid := to_regprocedure('public.delete_user_secure(uuid)');
  compatibility_function oid := to_regprocedure('public.delete_user(uuid)');
  private_function oid := to_regprocedure('private.delete_user_secure_impl(uuid)');
  function_definition text;
begin
  if public_function is null or compatibility_function is null or private_function is null then
    raise exception 'Secure user deletion functions are missing';
  end if;

  if exists (
    select 1 from pg_proc
    where oid in (public_function, compatibility_function)
      and prosecdef
  ) then
    raise exception 'Public user deletion wrapper must remain SECURITY INVOKER';
  end if;

  if not exists (select 1 from pg_proc where oid = private_function and prosecdef) then
    raise exception 'Private user deletion implementation must be SECURITY DEFINER';
  end if;

  if not has_function_privilege('authenticated', public_function, 'EXECUTE')
     or not has_function_privilege('authenticated', compatibility_function, 'EXECUTE')
     or not has_function_privilege('authenticated', private_function, 'EXECUTE') then
    raise exception 'Authenticated cannot reach the secure user deletion path';
  end if;

  if has_function_privilege('anon', public_function, 'EXECUTE')
     or has_function_privilege('anon', compatibility_function, 'EXECUTE')
     or has_function_privilege('anon', private_function, 'EXECUTE') then
    raise exception 'Anon can execute the secure user deletion path';
  end if;

  if has_function_privilege('authenticated', 'private.delete_user_impl(uuid)', 'EXECUTE') then
    raise exception 'Authenticated can still bypass the secure user deletion path';
  end if;

  if has_function_privilege('authenticated', 'public.delete_user_legacy_20260918(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.delete_user_legacy_20260918(uuid)', 'EXECUTE') then
    raise exception 'The retired public user deletion wrapper is still callable';
  end if;

  if pg_get_functiondef(compatibility_function) not like '%delete_user_secure_impl%'
     or pg_get_functiondef(public_function) not like '%delete_user_secure_impl%' then
    raise exception 'A public user deletion wrapper bypasses the secure implementation';
  end if;

  select pg_get_functiondef(private_function) into function_definition;
  if function_definition not like '%super_admin%'
     or function_definition not like '%active%'
     or function_definition not like '%cannot_delete_current_user%'
     or function_definition not like '%audit_logs%' then
    raise exception 'Secure user deletion is missing a required authorization or audit control';
  end if;

  if (
    select count(*)
    from pg_proc proc
    where proc.oid in (public_function, compatibility_function, private_function)
      and exists (
        select 1
        from unnest(coalesce(proc.proconfig, array[]::text[])) config(setting)
        where config.setting = 'search_path='
      )
  ) <> 3 then
    raise exception 'Secure user deletion functions do not pin an empty search_path';
  end if;
end;
$block$;

select 'PASS' as result, 'user deletion is authorized and audited server-side' as check_name;
