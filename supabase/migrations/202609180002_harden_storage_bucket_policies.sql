-- Consolidate Storage authorization at the database boundary.
-- UI visibility is not trusted: every object operation is checked here.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'site-content-assets',
    'site-content-assets',
    true,
    52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
  ),
  (
    'spd-service-request-guides',
    'spd-service-request-guides',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'spd-assistant-imports',
    'spd-assistant-imports',
    false,
    5242880,
    array['application/json', 'text/markdown', 'text/plain']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove every historical policy name for these buckets before rebuilding the
-- effective policy set. Public URLs for site-content-assets continue to work;
-- its SELECT policy only controls object metadata/listing through the API.
drop policy if exists "site content assets public read" on storage.objects;
drop policy if exists "site content assets admin read" on storage.objects;
drop policy if exists "site content assets admin insert" on storage.objects;
drop policy if exists "site content assets admin update" on storage.objects;
drop policy if exists "site content assets admin delete" on storage.objects;

drop policy if exists "spd service request guides public read" on storage.objects;
drop policy if exists "spd service request guides authenticated read" on storage.objects;
drop policy if exists "spd service request guides admin insert" on storage.objects;
drop policy if exists "spd service request guides admin update" on storage.objects;
drop policy if exists "spd service request guides admin delete" on storage.objects;

drop policy if exists "spd assistant imports admin read" on storage.objects;
drop policy if exists "spd assistant imports admin write" on storage.objects;
drop policy if exists "spd assistant imports admin update" on storage.objects;
drop policy if exists "spd assistant imports admin delete" on storage.objects;

drop policy if exists "smartdsp storage anon deny" on storage.objects;
drop policy if exists "smartdsp storage authenticated select guard" on storage.objects;
drop policy if exists "smartdsp storage authenticated insert guard" on storage.objects;
drop policy if exists "smartdsp storage authenticated update guard" on storage.objects;
drop policy if exists "smartdsp storage authenticated delete guard" on storage.objects;

create policy "site content assets admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

create policy "site content assets admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = any (array[
    'logos',
    'plan-covers',
    'home-logos',
    'login-page',
    'login-backgrounds',
    'portal-backgrounds',
    'portal-header-backgrounds',
    'public-home-documents',
    'portal-manuals',
    'ropa-links'
  ])
);

create policy "site content assets admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = any (array[
    'logos',
    'plan-covers',
    'home-logos',
    'login-page',
    'login-backgrounds',
    'portal-backgrounds',
    'portal-header-backgrounds',
    'public-home-documents',
    'portal-manuals',
    'ropa-links'
  ])
)
with check (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = any (array[
    'logos',
    'plan-covers',
    'home-logos',
    'login-page',
    'login-backgrounds',
    'portal-backgrounds',
    'portal-header-backgrounds',
    'public-home-documents',
    'portal-manuals',
    'ropa-links'
  ])
);

create policy "site content assets admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = any (array[
    'logos',
    'plan-covers',
    'home-logos',
    'login-page',
    'login-backgrounds',
    'portal-backgrounds',
    'portal-header-backgrounds',
    'public-home-documents',
    'portal-manuals',
    'ropa-links'
  ])
);

-- Private guide images may be read only by users whose profile is still active.
create policy "spd service request guides authenticated read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'spd-service-request-guides'
  and public.current_user_role() is not null
);

create policy "spd service request guides admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = 'digital-service'
);

create policy "spd service request guides admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = 'digital-service'
)
with check (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = 'digital-service'
);

create policy "spd service request guides admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and split_part(name, '/', 1) = 'digital-service'
);

create policy "spd assistant imports admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

create policy "spd assistant imports admin write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

create policy "spd assistant imports admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

create policy "spd assistant imports admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

-- Restrictive guards are evaluated in addition to permissive policies. They
-- prevent a separate broad policy from accidentally opening these buckets.
create policy "smartdsp storage anon deny"
on storage.objects
as restrictive
for all
to anon
using (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
)
with check (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
);

create policy "smartdsp storage authenticated select guard"
on storage.objects
as restrictive
for select
to authenticated
using (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
  or (
    bucket_id = 'site-content-assets'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
  or (
    bucket_id = 'spd-service-request-guides'
    and public.current_user_role() is not null
  )
  or (
    bucket_id = 'spd-assistant-imports'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
);

create policy "smartdsp storage authenticated insert guard"
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
  or (
    bucket_id = 'site-content-assets'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = any (array[
      'logos',
      'plan-covers',
      'home-logos',
      'login-page',
      'login-backgrounds',
      'portal-backgrounds',
      'portal-header-backgrounds',
      'public-home-documents',
      'portal-manuals',
      'ropa-links'
    ])
  )
  or (
    bucket_id = 'spd-service-request-guides'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = 'digital-service'
  )
  or (
    bucket_id = 'spd-assistant-imports'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
);

create policy "smartdsp storage authenticated update guard"
on storage.objects
as restrictive
for update
to authenticated
using (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
  or (
    bucket_id = 'site-content-assets'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = any (array[
      'logos',
      'plan-covers',
      'home-logos',
      'login-page',
      'login-backgrounds',
      'portal-backgrounds',
      'portal-header-backgrounds',
      'public-home-documents',
      'portal-manuals',
      'ropa-links'
    ])
  )
  or (
    bucket_id = 'spd-service-request-guides'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = 'digital-service'
  )
  or (
    bucket_id = 'spd-assistant-imports'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
)
with check (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
  or (
    bucket_id = 'site-content-assets'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = any (array[
      'logos',
      'plan-covers',
      'home-logos',
      'login-page',
      'login-backgrounds',
      'portal-backgrounds',
      'portal-header-backgrounds',
      'public-home-documents',
      'portal-manuals',
      'ropa-links'
    ])
  )
  or (
    bucket_id = 'spd-service-request-guides'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = 'digital-service'
  )
  or (
    bucket_id = 'spd-assistant-imports'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
);

create policy "smartdsp storage authenticated delete guard"
on storage.objects
as restrictive
for delete
to authenticated
using (
  bucket_id <> all (array[
    'site-content-assets',
    'spd-service-request-guides',
    'spd-assistant-imports'
  ])
  or (
    bucket_id = 'site-content-assets'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = any (array[
      'logos',
      'plan-covers',
      'home-logos',
      'login-page',
      'login-backgrounds',
      'portal-backgrounds',
      'portal-header-backgrounds',
      'public-home-documents',
      'portal-manuals',
      'ropa-links'
    ])
  )
  or (
    bucket_id = 'spd-service-request-guides'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    and split_part(name, '/', 1) = 'digital-service'
  )
  or (
    bucket_id = 'spd-assistant-imports'
    and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  )
);

commit;
