-- Make user deletion super-admin-only, active-account-only, and atomically audited.
-- Keep the privileged implementation in the private schema and expose only an
-- invoker RPC wrapper to authenticated clients.

begin;

create or replace function private.delete_user_secure_impl(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_user_id uuid := auth.uid();
  actor_name text;
  actor_role public.user_role;
  actor_status public.profile_status;
  target_name text;
  target_role public.user_role;
  target_status public.profile_status;
begin
  if actor_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select profile.full_name, profile.role, profile.status
  into actor_name, actor_role, actor_status
  from public.profiles as profile
  where profile.user_id = actor_user_id;

  if not found
     or actor_role <> 'super_admin'::public.user_role
     or actor_status <> 'active'::public.profile_status then
    raise exception using errcode = '42501', message = 'active_super_admin_required';
  end if;

  if target_user_id is null then
    raise exception using errcode = '22023', message = 'target_user_id_required';
  end if;

  if target_user_id = actor_user_id then
    raise exception using errcode = '42501', message = 'cannot_delete_current_user';
  end if;

  select profile.full_name, profile.role, profile.status
  into target_name, target_role, target_status
  from public.profiles as profile
  where profile.user_id = target_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'target_profile_not_found';
  end if;

  perform private.delete_user_impl(target_user_id);

  insert into public.audit_logs (
    actor_id,
    actor_user_id,
    actor_email,
    actor_name,
    actor_role,
    module,
    action,
    route,
    resource_type,
    resource_id,
    target_type,
    target_id,
    status,
    metadata,
    export_status
  )
  values (
    actor_user_id,
    actor_user_id,
    auth.jwt() ->> 'email',
    actor_name,
    actor_role::text,
    'user_management',
    'user_delete',
    '/admin/users',
    'user',
    target_user_id::text,
    'user',
    target_user_id::text,
    'success',
    jsonb_build_object(
      'target_name', target_name,
      'target_role', target_role,
      'target_status', target_status
    ),
    'pending'
  );
end;
$function$;

-- Replace the historical wrapper without assuming its original return type.
-- Keeping the old RPC name as a secure compatibility alias prevents a
-- deployment-order outage while the frontend moves to delete_user_secure.
alter function public.delete_user(uuid) rename to delete_user_legacy_20260918;
revoke all on function public.delete_user_legacy_20260918(uuid) from public, anon, authenticated;

create function public.delete_user(target_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.delete_user_secure_impl(target_user_id);
$function$;

create function public.delete_user_secure(target_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.delete_user_secure_impl(target_user_id);
$function$;

-- Retire direct access to the unaudited implementation. Both public RPC names
-- now route through the same secure implementation.
revoke all on function private.delete_user_impl(uuid) from public, anon, authenticated;

revoke all on function public.delete_user(uuid) from public, anon, authenticated;
revoke all on function public.delete_user_secure(uuid) from public, anon, authenticated;
revoke all on function private.delete_user_secure_impl(uuid) from public, anon, authenticated;

grant execute on function private.delete_user_secure_impl(uuid) to authenticated;
grant execute on function public.delete_user(uuid) to authenticated;
grant execute on function public.delete_user_secure(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
