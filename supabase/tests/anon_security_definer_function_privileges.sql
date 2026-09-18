-- Run after migrations. The query must return zero rows.
-- It checks the phase-1 contract without invoking functions that mutate data.

with expected(function_signature, anon_can_execute) as (
  values
    ('public.capture_public_performance_result_history()', false),
    ('public.capture_public_research_item_history()', false),
    ('public.capture_site_content_history()', false),
    ('public.clear_personnel_only_permissions_on_role_change()', false),
    ('public.create_training_record_with_details(uuid,text,text,text,text,date,integer,text,text,text,text,text)', false),
    ('public.current_user_role()', false),
    ('public.delete_user(uuid)', false),
    ('public.delete_user_secure(uuid)', false),
    ('public.generate_spd_service_ticket_no(text,date)', false),
    ('public.get_public_visit_stats()', true),
    ('public.get_spd_service_ai_chatgpt_booking_calendar(date,date)', false),
    ('public.handle_new_user()', false),
    ('public.increment_audit_log_retry_count(uuid[])', false),
    ('public.increment_public_web_page_view_count(uuid)', true),
    ('public.is_privileged_role(public.user_role[])', false),
    ('public.list_user_management_profiles()', false),
    ('public.protect_force_password_change_fields()', false),
    ('public.protect_super_admin_training_records()', false),
    ('public.record_public_page_visit(uuid,text,text,boolean,text)', true),
    ('public.update_own_profile_details(text,text,text,text,text,text,text,date,text)', false),
    ('public.update_own_profile_details(text,text,text,text,text,text,text,date,date,text)', false),
    ('public.update_user_profile_details(uuid,text,text,text,text,text,text,text,date,text)', false),
    ('public.update_user_profile_details(uuid,text,text,text,text,text,text,text,date,date,text)', false),
    ('public.validate_public_home_section()', false),
    ('public.validate_public_repository_category()', false)
), actual as (
  select
    function_signature,
    anon_can_execute,
    has_function_privilege('anon', function_signature, 'EXECUTE') as actual_anon_can_execute
  from expected
)
select
  function_signature,
  anon_can_execute as expected,
  actual_anon_can_execute as actual
from actual
where actual_anon_can_execute is distinct from anon_can_execute
order by function_signature;
