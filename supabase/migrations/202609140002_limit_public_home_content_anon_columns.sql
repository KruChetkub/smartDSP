-- Keep the anonymous Home API limited to fields rendered by the public page.
-- Admins retain the existing authenticated table-level SELECT grant.

begin;

revoke select on table public.public_home_content_items from anon;

grant select (
  id,
  section,
  title,
  description,
  action_label,
  target_view,
  icon_key,
  color_key,
  logo_url,
  pdf_url,
  sort_order,
  status,
  created_at,
  updated_at
) on table public.public_home_content_items to anon;

notify pgrst, 'reload schema';

commit;
