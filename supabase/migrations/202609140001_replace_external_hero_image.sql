-- Keep the public home hero compatible with the production image CSP.
-- Future hero images should be uploaded to the project's Supabase Storage.

begin;

update public.site_content_documents
set content = jsonb_set(
  content,
  '{heroBanner,imageUrl}',
  to_jsonb('/SmartDSP.png'::text),
  true
)
where content_key = 'public-home'
  and content #>> '{heroBanner,imageUrl}' like 'https://images.unsplash.com/%';

commit;
