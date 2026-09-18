-- Expose report-only training data through a role-checked RPC.
-- Existing table policies remain unchanged for the operational training modules.

begin;

create or replace function private.list_training_report_records_impl(p_year integer default null)
returns table (
  id uuid,
  user_id uuid,
  course text,
  category text,
  subcategory text,
  organizer text,
  date date,
  month integer,
  year integer,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  personnel_name text,
  employee_code text,
  "position" text,
  department text,
  work_group text,
  certificate_name text,
  certificate_link text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role public.user_role;
begin
  select profile.role
  into caller_role
  from public.profiles as profile
  where profile.user_id = auth.uid()
    and profile.status = 'active'::public.profile_status
  limit 1;

  if caller_role is null
    or caller_role not in ('super_admin'::public.user_role, 'admin'::public.user_role)
  then
    raise exception using
      errcode = '42501',
      message = 'permission denied';
  end if;

  if p_year is not null and p_year not between 2400 and 2700 then
    raise exception using
      errcode = '22023',
      message = 'invalid fiscal year';
  end if;

  return query
  select
    training.id,
    training.user_id,
    training.course,
    training.category,
    training.subcategory,
    training.organizer,
    training.date,
    training.month,
    training.year,
    training.created_by,
    training.created_at,
    training.updated_at,
    profile.full_name as personnel_name,
    profile.employee_code,
    coalesce(profile.position, '-') as position,
    coalesce(profile.department, '-') as department,
    coalesce(profile.work_group, '-') as work_group,
    certificate.certificate_name,
    certificate.certificate_link
  from public.training_records as training
  inner join public.profiles as profile
    on profile.user_id = training.user_id
  left join lateral (
    select
      candidate.certificate_name,
      candidate.certificate_link
    from public.certificates as candidate
    where candidate.training_id = training.id
      and (
        nullif(btrim(candidate.certificate_name), '') is not null
        or nullif(btrim(candidate.certificate_link), '') is not null
        or nullif(btrim(candidate.file_path), '') is not null
      )
    order by candidate.created_at desc, candidate.id desc
    limit 1
  ) as certificate on true
  where profile.status = 'active'::public.profile_status
    and profile.role <> 'super_admin'::public.user_role
    and (p_year is null or training.year = p_year)
  order by training.date desc, training.created_at desc, training.id;
end;
$$;

revoke all on function private.list_training_report_records_impl(integer)
from public, anon, authenticated;

grant execute on function private.list_training_report_records_impl(integer)
to authenticated;

create or replace function public.list_training_report_records(p_year integer default null)
returns table (
  id uuid,
  user_id uuid,
  course text,
  category text,
  subcategory text,
  organizer text,
  date date,
  month integer,
  year integer,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  personnel_name text,
  employee_code text,
  "position" text,
  department text,
  work_group text,
  certificate_name text,
  certificate_link text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_training_report_records_impl(p_year);
$$;

revoke all on function public.list_training_report_records(integer)
from public, anon, authenticated;

grant execute on function public.list_training_report_records(integer)
to authenticated;

notify pgrst, 'reload schema';

commit;
