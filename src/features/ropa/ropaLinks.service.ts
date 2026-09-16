import { supabase } from '../../lib/supabase';
import type { Database, RopaLink } from '../../types/database.types';
import {
  optionalPlainTextInput,
  sanitizeImageUrlInput,
  sanitizePlainTextInput,
  sanitizeUrlInput,
  validateUploadFile,
} from '../../utils/inputSecurity';
import { createUuid } from '../../utils/uuid';

const ROPA_ASSETS_BUCKET = 'site-content-assets';
const ROPA_ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ROPA_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type RopaLinkDraft = {
  id?: string;
  title: string;
  description: string | null;
  linkUrl: string;
  iconUrl: string | null;
  iconPath: string | null;
  previewUrl: string | null;
  previewPath: string | null;
  isActive: boolean;
  sortOrder: number;
};

type RopaLinkInsert = Database['public']['Tables']['ropa_links']['Insert'];
type RopaLinkUpdate = Database['public']['Tables']['ropa_links']['Update'];

function sanitizeRopaLinkUrl(value: string) {
  const text = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (text.startsWith('/') && !text.startsWith('//') && /^\/[A-Za-z0-9/_?&=.%#-]*$/.test(text)) return text;
  return sanitizeUrlInput(text, { fieldName: 'ลิงก์เมนู', maxLength: 1000 });
}

function normalizeDraft(draft: RopaLinkDraft, updatedBy: string | null, index: number): RopaLinkInsert {
  const title = sanitizePlainTextInput(draft.title, {
    fieldName: 'ชื่อเมนู',
    maxLength: 160,
    allowNewlines: false,
  });
  const linkUrl = sanitizeRopaLinkUrl(draft.linkUrl);

  if (!title) throw new Error('กรุณากรอกชื่อเมนู');
  if (!linkUrl) throw new Error('กรุณากรอกลิงก์เมนู');

  return {
    id: draft.id,
    title,
    description: optionalPlainTextInput(draft.description, {
      fieldName: 'รายละเอียดเมนู',
      maxLength: 300,
      allowNewlines: false,
    }),
    link_url: linkUrl,
    icon_url: sanitizeImageUrlInput(draft.iconUrl, { fieldName: 'URL รูปไอคอน' }),
    icon_path: draft.iconPath || null,
    preview_url: sanitizeImageUrlInput(draft.previewUrl, { fieldName: 'URL ภาพตัวอย่าง' }),
    preview_path: draft.previewPath || null,
    is_active: draft.isActive,
    sort_order: (index + 1) * 10,
    updated_by: updatedBy,
  };
}

function toDraft(row: RopaLink): RopaLinkDraft {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    linkUrl: row.link_url,
    iconUrl: row.icon_url,
    iconPath: row.icon_path,
    previewUrl: row.preview_url,
    previewPath: row.preview_path,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function listActiveRopaLinks() {
  const { data, error } = await supabase
    .from('ropa_links')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw new Error(`โหลดเมนู ROPA ไม่สำเร็จ: ${error.message}`);
  return (data || []) as RopaLink[];
}

export async function listRopaLinksForAdmin() {
  const { data, error } = await supabase
    .from('ropa_links')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw new Error(`โหลดการตั้งค่าเมนู ROPA ไม่สำเร็จ: ${error.message}`);
  return ((data || []) as RopaLink[]).map(toDraft);
}

export async function saveRopaLinkSettings(input: {
  links: RopaLinkDraft[];
  deletedIds: string[];
  updatedBy: string | null;
}) {
  const normalizedLinks = input.links.map((link, index) => normalizeDraft(link, input.updatedBy, index));

  if (input.deletedIds.length > 0) {
    const { error } = await supabase.from('ropa_links').delete().in('id', input.deletedIds);
    if (error) throw new Error(`ลบเมนู ROPA ไม่สำเร็จ: ${error.message}`);
  }

  for (const link of normalizedLinks) {
    if (link.id) {
      const updatePayload: RopaLinkUpdate = {
        title: link.title,
        description: link.description ?? null,
        link_url: link.link_url,
        icon_url: link.icon_url ?? null,
        icon_path: link.icon_path ?? null,
        preview_url: link.preview_url ?? null,
        preview_path: link.preview_path ?? null,
        is_active: link.is_active,
        sort_order: link.sort_order,
        updated_by: link.updated_by ?? null,
      };
      const { error } = await supabase.from('ropa_links').update(updatePayload).eq('id', link.id);
      if (error) throw new Error(`บันทึกเมนู ROPA ไม่สำเร็จ: ${error.message}`);
    } else {
      const { error } = await supabase.from('ropa_links').insert(link);
      if (error) throw new Error(`เพิ่มเมนู ROPA ไม่สำเร็จ: ${error.message}`);
    }
  }

  return listRopaLinksForAdmin();
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadRopaLinkImage(file: File, kind: 'icon' | 'preview') {
  validateUploadFile(file, {
    allowedTypes: ROPA_ALLOWED_IMAGE_TYPES,
    maxSizeBytes: ROPA_MAX_IMAGE_SIZE_BYTES,
    label: kind === 'icon' ? 'รูปไอคอน' : 'ภาพตัวอย่าง',
  });

  const extension = file.name.split('.').pop() || 'png';
  const safeName = sanitizeFileName(file.name) || `${kind}.${extension}`;
  const filePath = `ropa-links/${kind}/${Date.now()}-${createUuid()}-${safeName}`;
  const { error } = await supabase.storage.from(ROPA_ASSETS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw new Error(`อัปโหลด${kind === 'icon' ? 'รูปไอคอน' : 'ภาพตัวอย่าง'}ไม่สำเร็จ: ${error.message}`);
  const { data } = supabase.storage.from(ROPA_ASSETS_BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}
