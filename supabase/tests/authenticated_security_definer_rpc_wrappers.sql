-- Static security contract for CSV v2 SECURITY DEFINER remediation.
-- Run after applying 202609070005_harden_authenticated_security_definer_rpcs.sql
-- and 202609070011_restrict_trigger_helper_execute.sql.

do $block$
declare
  signature text;
  function_oid oid;
  public_signatures constant text[] := array[
    'public.clear_smartdsp_survey_round_data(uuid)',
    'public.clone_smartdsp_survey(uuid)',
    'public.complete_forced_password_change()',
    'public.complete_smartdsp_survey_respondent_context(uuid,jsonb)',
    'public.create_training_record_with_details(uuid,text,text,text,text,date,integer,text,text,text,text,text)',
    'public.delete_smartdsp_survey_response(uuid)',
    'public.delete_user(uuid)',
    'public.delete_user_secure(uuid)',
    'public.generate_spd_service_ticket_no(text,date)',
    'public.get_spd_assistant_page_context(text)',
    'public.get_spd_service_ai_chatgpt_booking_calendar(date,date)',
    'public.list_force_password_change_users()',
    'public.list_my_permissions()',
    'public.list_user_management_profiles()',
    'public.list_user_permission_assignments(text)',
    'public.save_smartdsp_survey_questions(uuid,jsonb)',
    'public.search_spd_assistant_knowledge(text,text,text,integer)',
    'public.set_force_password_change(uuid[],boolean)',
    'public.set_user_permission(uuid,text,boolean)',
    'public.submit_smartdsp_survey_with_context(uuid,jsonb,jsonb,uuid)',
    'public.update_own_profile_details(text,text,text,text,text,text,text,date,text)',
    'public.update_own_profile_details(text,text,text,text,text,text,text,date,date,text)',
    'public.update_user_profile_details(uuid,text,text,text,text,text,text,text,date,text)',
    'public.update_user_profile_details(uuid,text,text,text,text,text,text,text,date,date,text)'
  ];
begin
  foreach signature in array public_signatures
  loop
    function_oid := to_regprocedure(signature);

    if function_oid is null then
      raise exception 'Expected public RPC is missing: %', signature;
    end if;

    if exists (
      select 1
      from pg_proc proc
      where proc.oid = function_oid
        and proc.prosecdef
    ) then
      raise exception 'Public RPC is still SECURITY DEFINER: %', signature;
    end if;

    if not coalesce(has_function_privilege('authenticated', function_oid, 'EXECUTE'), false) then
      raise exception 'Authenticated cannot execute public RPC: %', signature;
    end if;

    if coalesce(has_function_privilege('anon', function_oid, 'EXECUTE'), false) then
      raise exception 'Anon can execute authenticated-only RPC: %', signature;
    end if;

    if not exists (
      select 1
      from pg_proc proc
      where proc.oid = function_oid
        and exists (
          select 1
          from unnest(coalesce(proc.proconfig, array[]::text[])) config(setting)
          where config.setting like 'search_path=%'
        )
    ) then
      raise exception 'Public RPC does not have an empty search_path: %', signature;
    end if;
  end loop;

  if not has_function_privilege(
    'service_role',
    'public.increment_audit_log_retry_count(uuid[])',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute increment_audit_log_retry_count';
  end if;

  if exists (
    select 1
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = any (array[
        'clear_smartdsp_survey_round_data',
        'clone_smartdsp_survey',
        'complete_forced_password_change',
        'complete_smartdsp_survey_respondent_context',
        'create_training_record_with_details',
        'current_user_role',
        'delete_smartdsp_survey_response',
        'delete_user',
        'delete_user_secure',
        'generate_spd_service_ticket_no',
        'get_spd_assistant_page_context',
        'get_spd_service_ai_chatgpt_booking_calendar',
        'has_permission',
        'increment_audit_log_retry_count',
        'is_privileged_role',
        'list_force_password_change_users',
        'list_my_permissions',
        'list_user_management_profiles',
        'list_user_permission_assignments',
        'save_smartdsp_survey_questions',
        'search_spd_assistant_knowledge',
        'set_force_password_change',
        'set_user_permission',
        'spd_assistant_match_role',
        'submit_smartdsp_survey_with_context',
        'update_own_profile_details',
        'update_user_profile_details'
      ])
      and proc.prosecdef
      and has_function_privilege('authenticated', proc.oid, 'EXECUTE')
  ) then
    raise exception 'An authenticated callable SECURITY DEFINER function remains in public';
  end if;
end;
$block$;

select
  'PASS' as result,
  'authenticated RPC wrappers remain invoker-only and correctly granted' as check_name;
