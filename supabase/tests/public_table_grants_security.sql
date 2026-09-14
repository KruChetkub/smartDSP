-- Security contract for 202609070008_align_public_table_grants_with_rls.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  relation_record record;
  role_name name;
  operation text;
  has_grant boolean;
  has_policy boolean;
  public_acl_entries text;
begin
  select string_agg(
    format('%I.%I:%s', namespace.nspname, relation.relname, acl.privilege_type),
    ', '
    order by namespace.nspname, relation.relname, acl.privilege_type
  )
  into public_acl_entries
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  cross join lateral aclexplode(
    coalesce(relation.relacl, acldefault('r', relation.relowner))
  ) acl
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and acl.grantee = 0;

  if public_acl_entries is not null then
    raise exception 'Database role PUBLIC still has table privileges: %',
      public_acl_entries;
  end if;

  for relation_record in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      relation.oid as table_oid
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
    order by relation.relname
  loop
    foreach role_name in array array['anon', 'authenticated']::name[]
    loop
      foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      loop
        has_grant := has_table_privilege(
          role_name,
          relation_record.table_oid,
          operation
        ) or (
          operation = 'SELECT'
          and has_any_column_privilege(
            role_name,
            relation_record.table_oid,
            operation
          )
        );

        select exists (
          select 1
          from pg_policies policy
          where policy.schemaname = relation_record.schema_name
            and policy.tablename = relation_record.table_name
            and policy.cmd in (operation, 'ALL')
            and policy.roles && array[role_name, 'public'::name]
        )
        into has_policy;

        if has_grant is distinct from has_policy then
          raise exception 'Grant/policy mismatch: role=%, table=%.%, operation=%, grant=%, policy=%',
            role_name,
            relation_record.schema_name,
            relation_record.table_name,
            operation,
            has_grant,
            has_policy;
        end if;
      end loop;

      foreach operation in array array['TRUNCATE', 'REFERENCES', 'TRIGGER']
      loop
        if has_table_privilege(
          role_name,
          relation_record.table_oid,
          operation
        ) then
          raise exception 'Unexpected elevated table privilege: role=%, table=%.%, operation=%',
            role_name,
            relation_record.schema_name,
            relation_record.table_name,
            operation;
        end if;
      end loop;
    end loop;

    foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    loop
      if not has_table_privilege(
        'service_role',
        relation_record.table_oid,
        operation
      ) then
        raise exception 'service_role lost required CRUD privilege: table=%.%, operation=%',
          relation_record.schema_name,
          relation_record.table_name,
          operation;
      end if;
    end loop;
  end loop;

  if has_column_privilege('anon', 'public.public_home_content_items', 'created_by', 'SELECT')
    or has_column_privilege('anon', 'public.public_home_content_items', 'updated_by', 'SELECT')
  then
    raise exception 'anon can read internal author columns from public_home_content_items';
  end if;

  if not has_column_privilege('anon', 'public.public_home_content_items', 'id', 'SELECT')
    or not has_column_privilege('anon', 'public.public_home_content_items', 'title', 'SELECT')
  then
    raise exception 'anon lost required public columns from public_home_content_items';
  end if;
end;
$block$;

select
  'PASS' as result,
  'public table grants match RLS policy operations' as check_name;
