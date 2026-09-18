-- Security contract for 202609070011_restrict_trigger_helper_execute.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  routine_record record;
  signature text;
  function_oid oid;
  unexpected_anon_routines text;
  restricted_helpers constant text[] := array[
    'public.increment_audit_log_retry_count(uuid[])',
    'public.spd_assistant_normalize_route(text)'
  ];
  authenticated_runtime_helpers constant text[] := array[
    'public.calculate_generation_from_birth_date(date)',
    'public.smartdsp_survey_is_open(public.smartdsp_surveys)',
    'public.current_user_role()',
    'public.has_permission(text)',
    'public.is_privileged_role(public.user_role[])',
    'public.spd_assistant_match_role(public.user_role[])'
  ];
  allowed_anon_routines constant text[] := array[
    'public.get_public_visit_stats()',
    'public.increment_public_web_page_view_count(uuid)',
    'public.record_public_page_visit(uuid,text,text,boolean,text)'
  ];
begin
  for routine_record in
    select distinct procedure.oid, procedure.oid::regprocedure::text as signature
    from pg_trigger trigger_definition
    join pg_proc procedure on procedure.oid = trigger_definition.tgfoid
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where not trigger_definition.tgisinternal
      and namespace.nspname = 'public'
  loop
    if has_function_privilege('anon', routine_record.oid, 'EXECUTE')
      or has_function_privilege('authenticated', routine_record.oid, 'EXECUTE')
    then
      raise exception 'Trigger function is directly client-callable: %',
        routine_record.signature;
    end if;
  end loop;

  foreach signature in array restricted_helpers
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected database-only helper is missing: %', signature;
    end if;

    if has_function_privilege('anon', function_oid, 'EXECUTE')
      or has_function_privilege('authenticated', function_oid, 'EXECUTE')
    then
      raise exception 'Database-only helper is directly client-callable: %',
        signature;
    end if;
  end loop;

  foreach signature in array authenticated_runtime_helpers
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected authenticated runtime helper is missing: %',
        signature;
    end if;

    if has_function_privilege('anon', function_oid, 'EXECUTE')
      or not has_function_privilege('authenticated', function_oid, 'EXECUTE')
    then
      raise exception 'Runtime helper privileges are incorrect: %', signature;
    end if;
  end loop;

  foreach signature in array allowed_anon_routines
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null
      or not has_function_privilege('anon', function_oid, 'EXECUTE')
    then
      raise exception 'Expected public analytics RPC is unavailable: %',
        signature;
    end if;
  end loop;

  select string_agg(
    procedure.oid::regprocedure::text,
    ', '
    order by procedure.oid::regprocedure::text
  )
  into unexpected_anon_routines
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.prokind = 'f'
    and has_function_privilege('anon', procedure.oid, 'EXECUTE')
    and procedure.oid <> all (
      array(
        select to_regprocedure(allowed_signature)
        from unnest(allowed_anon_routines) allowed(allowed_signature)
      )
    );

  if unexpected_anon_routines is not null then
    raise exception 'Unexpected anon-callable routines: %',
      unexpected_anon_routines;
  end if;

  if not has_function_privilege(
    'service_role',
    'public.increment_audit_log_retry_count(uuid[])',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute backend audit retry RPC';
  end if;
end;
$block$;

select
  'PASS' as result,
  'trigger functions and database-only helpers are not client-callable' as check_name;
