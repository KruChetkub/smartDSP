-- Present ROPA destinations as visual cards with managed icon and preview images.

begin;

alter table public.ropa_links
  add column if not exists icon_url text,
  add column if not exists icon_path text,
  add column if not exists preview_url text,
  add column if not exists preview_path text;

alter table public.ropa_links
  drop constraint if exists ropa_links_link_url_check;

alter table public.ropa_links
  add constraint ropa_links_link_url_check check (
    char_length(link_url) <= 1000
    and (
      link_url ~* '^https?://'
      or link_url ~ '^/[A-Za-z0-9/_?&=.%#-]*$'
    )
  ),
  add constraint ropa_links_icon_url_length_check
    check (icon_url is null or char_length(icon_url) <= 2048),
  add constraint ropa_links_preview_url_length_check
    check (preview_url is null or char_length(preview_url) <= 2048),
  add constraint ropa_links_icon_path_length_check
    check (icon_path is null or char_length(icon_path) <= 500),
  add constraint ropa_links_preview_path_length_check
    check (preview_path is null or char_length(preview_path) <= 500);

insert into public.ropa_links (
  title,
  description,
  link_url,
  is_active,
  sort_order
)
select
  'ตัวอย่าง Privacy Notice',
  'ตัวอย่างประกาศความเป็นส่วนตัวสำหรับนำไปประยุกต์ใช้ในหน่วยงาน',
  '/privacy-notice',
  true,
  20
where not exists (
  select 1
  from public.ropa_links
  where link_url = '/privacy-notice'
);

notify pgrst, 'reload schema';

commit;
