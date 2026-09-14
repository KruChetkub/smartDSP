import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import type { SiteContentState } from '../types/siteContent.types';
import { normalizeSiteContent } from './siteContent.storage';

const HOME_CONTENT_KEY = 'public-home';

type SiteContentDocumentRow = {
  content_key: string;
  content: SiteContentState;
  status: 'published' | 'draft' | 'scheduled';
  published_at: string | null;
  updated_at: string;
};

export async function loadSiteContentFromSupabase() {
  const { data } = await runSupabaseQuery(
    supabase
      .from('site_content_documents')
      .select('content_key, content, status, published_at, updated_at')
      .eq('content_key', HOME_CONTENT_KEY)
      .eq('status', 'published')
      .maybeSingle(),
    'โหลดข้อมูลหน้า Home จาก Supabase',
  );

  return data as SiteContentDocumentRow | null;
}

export async function saveSiteContentToSupabase(content: SiteContentState) {
  const normalizedContent = normalizeSiteContent(content);
  const { data } = await runSupabaseQuery(
    supabase
      .from('site_content_documents')
      .upsert(
        {
          content_key: HOME_CONTENT_KEY,
          content: normalizedContent as unknown as Record<string, unknown>,
          status: 'published',
          published_at: new Date().toISOString(),
        },
        { onConflict: 'content_key' },
      )
      .select('content_key, content, status, published_at, updated_at')
      .single(),
    'บันทึกข้อมูลหน้า Home ไป Supabase',
  );

  return data as SiteContentDocumentRow;
}
