import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { sanitizeImageUrlInput, sanitizePlainTextInput, sanitizeUrlInput } from '../../../utils/inputSecurity';
import { createUuid } from '../../../utils/uuid';
import type { PublicRepositoryCategoryTone } from './publicRepositoryCategories.service';

export type PublicWebPageStatus = 'draft' | 'published';
export type PublicWebPageCoverLayout = 'portrait' | 'landscape';

export type PublicWebPage = {
  id: string;
  category: string;
  slug: string;
  title: string;
  description: string;
  status: PublicWebPageStatus;
  viewCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicWebPageItem = {
  id: string;
  pageId: string;
  category: string;
  title: string;
  description: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: PublicWebPageCoverLayout;
  sortOrder: number;
  status: PublicWebPageStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicWebPageWithItems = PublicWebPage & { items: PublicWebPageItem[] };

type PageRow = {
  id: string;
  category: string;
  slug: string;
  title: string;
  description: string;
  status: PublicWebPageStatus;
  view_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  page_id: string;
  category: string;
  title: string;
  description: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: PublicWebPageCoverLayout;
  sort_order: number;
  status: PublicWebPageStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseFrom = (table: string) => any;
type SupabaseRpc = (fn: string, args?: Record<string, unknown>) => any;
type SupabaseResult<T> = { data: T; error: unknown | null };

export const PUBLIC_WEB_PAGES_UPDATED_EVENT = 'smartdsp-public-web-pages-updated';

const pageColumns = 'id, category, slug, title, description, status, view_count, created_by, updated_by, created_at, updated_at';
const itemColumns = 'id, page_id, category, title, description, pdf_url, cover_image_url, cover_image_layout, sort_order, status, created_by, updated_by, created_at, updated_at';

function pagesTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_web_pages');
}

function itemsTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_web_page_items');
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export function createSlugFromTitle(title: string) {
  return normalizeSlug(title) || `page-${createUuid().slice(0, 8)}`;
}

function mapPageRow(row: PageRow): PublicWebPage {
  return {
    id: row.id,
    category: row.category || 'general',
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    status: row.status,
    viewCount: row.view_count || 0,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: ItemRow): PublicWebPageItem {
  return {
    id: row.id,
    pageId: row.page_id,
    category: row.category || 'general',
    title: row.title,
    description: row.description || '',
    pdfUrl: row.pdf_url || '',
    coverImageUrl: row.cover_image_url || '',
    coverImageLayout: row.cover_image_layout === 'landscape' ? 'landscape' : 'portrait',
    sortOrder: row.sort_order || 10,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPageToRow(page: PublicWebPage) {
  const slug = normalizeSlug(page.slug);
  if (!slug) throw new Error('กรุณาระบุ slug สำหรับลิงก์หน้าเว็บไซต์');
  return {
    id: page.id,
    category: page.category,
    slug,
    title: sanitizePlainTextInput(page.title, { fieldName: 'ชื่อหน้าเว็บไซต์', maxLength: 160, allowNewlines: false }),
    description: sanitizePlainTextInput(page.description, { fieldName: 'รายละเอียดหน้าเว็บไซต์', maxLength: 4000, allowNewlines: true }),
    status: page.status,
    created_by: page.createdBy,
    updated_by: page.updatedBy,
  };
}

function mapItemToRow(item: PublicWebPageItem) {
  return {
    id: item.id,
    page_id: item.pageId,
    category: item.category || 'general',
    title: sanitizePlainTextInput(item.title, { fieldName: 'ชื่อแผน/เอกสาร', maxLength: 160, allowNewlines: false }),
    description: sanitizePlainTextInput(item.description, { fieldName: 'รายละเอียด', maxLength: 4000, allowNewlines: true }),
    pdf_url: sanitizeUrlInput(item.pdfUrl, { fieldName: 'ลิงก์เอกสาร PDF', maxLength: 2048 }) || '',
    cover_image_url: sanitizeImageUrlInput(item.coverImageUrl, { fieldName: 'ลิงก์ภาพหน้าปก', maxLength: 2048 }) || '',
    cover_image_layout: item.coverImageLayout,
    sort_order: Math.max(1, Math.round(item.sortOrder || 10)),
    status: item.status,
    created_by: item.createdBy,
    updated_by: item.updatedBy,
  };
}

export function comparePublicWebPages(first: PublicWebPage, second: PublicWebPage) {
  return first.category.localeCompare(second.category, 'th') || second.updatedAt.localeCompare(first.updatedAt) || first.title.localeCompare(second.title, 'th');
}

export function comparePublicWebPageItems(first: PublicWebPageItem, second: PublicWebPageItem) {
  return first.category.localeCompare(second.category, 'th') || first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt) || first.title.localeCompare(second.title, 'th');
}

export async function loadPublicWebPages() {
  const { data } = await runSupabaseQuery<SupabaseResult<PageRow[]>>(pagesTable().select(pageColumns).order('updated_at', { ascending: false }), 'โหลดหน้าเว็บไซต์เพิ่มเติม');
  return ((data || []) as PageRow[]).map(mapPageRow).sort(comparePublicWebPages);
}

export async function loadPublicWebPageItems(pageId: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<ItemRow[]>>(itemsTable().select(itemColumns).eq('page_id', pageId).order('category').order('sort_order').order('updated_at', { ascending: false }), 'โหลดรายการในหน้าเว็บไซต์');
  return ((data || []) as ItemRow[]).map(mapItemRow).sort(comparePublicWebPageItems);
}

export async function loadPublishedPublicWebPageWithItems(slug: string): Promise<PublicWebPageWithItems | null> {
  const { data } = await runSupabaseQuery<SupabaseResult<PageRow | null>>(pagesTable().select(pageColumns).eq('slug', normalizeSlug(slug)).eq('status', 'published').maybeSingle(), 'โหลดหน้าเว็บไซต์สาธารณะ');
  if (!data) return null;
  const page = mapPageRow(data);
  const { data: itemRows } = await runSupabaseQuery<SupabaseResult<ItemRow[]>>(itemsTable().select(itemColumns).eq('page_id', page.id).eq('status', 'published').order('category').order('sort_order').order('updated_at', { ascending: false }), 'โหลดรายการเผยแพร่ในหน้าเว็บไซต์');
  return { ...page, items: ((itemRows || []) as ItemRow[]).map(mapItemRow).sort(comparePublicWebPageItems) };
}

export function getPublicWebPageCategoryTone(category: string): PublicRepositoryCategoryTone {
  if (category === 'policy') return 'emerald';
  if (category === 'document') return 'violet';
  return 'blue';
}

export async function savePublicWebPage(page: PublicWebPage) {
  const row = mapPageToRow(page);
  const { data: updatedData } = await runSupabaseQuery<SupabaseResult<PageRow | null>>(pagesTable().update(row).eq('id', page.id).select(pageColumns).maybeSingle(), 'แก้ไขหน้าเว็บไซต์เพิ่มเติม');
  const savedRow = updatedData || (await runSupabaseQuery<SupabaseResult<PageRow>>(pagesTable().insert(row).select(pageColumns).single(), 'เพิ่มหน้าเว็บไซต์เพิ่มเติม')).data;
  return mapPageRow(savedRow);
}

export async function savePublicWebPageItem(item: PublicWebPageItem) {
  const row = mapItemToRow(item);
  const { data: updatedData } = await runSupabaseQuery<SupabaseResult<ItemRow | null>>(itemsTable().update(row).eq('id', item.id).select(itemColumns).maybeSingle(), 'แก้ไขรายการในหน้าเว็บไซต์');
  const savedRow = updatedData || (await runSupabaseQuery<SupabaseResult<ItemRow>>(itemsTable().insert(row).select(itemColumns).single(), 'เพิ่มรายการในหน้าเว็บไซต์')).data;
  return mapItemRow(savedRow);
}

export async function updatePublicWebPageStatus(id: string, status: PublicWebPageStatus, userId: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<PageRow>>(pagesTable().update({ status, updated_by: userId }).eq('id', id).select(pageColumns).single(), 'เปลี่ยนสถานะหน้าเว็บไซต์เพิ่มเติม');
  return mapPageRow(data);
}

export async function updatePublicWebPageItemStatus(id: string, status: PublicWebPageStatus, userId: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<ItemRow>>(itemsTable().update({ status, updated_by: userId }).eq('id', id).select(itemColumns).single(), 'เปลี่ยนสถานะรายการในหน้าเว็บไซต์');
  return mapItemRow(data);
}

export async function deletePublicWebPage(id: string) {
  await runSupabaseQuery<SupabaseResult<null>>(pagesTable().delete().eq('id', id), 'ลบหน้าเว็บไซต์เพิ่มเติม');
}

export async function deletePublicWebPageItem(id: string) {
  await runSupabaseQuery<SupabaseResult<null>>(itemsTable().delete().eq('id', id), 'ลบรายการในหน้าเว็บไซต์');
}

export async function incrementPublicWebPageViewCount(id: string) {
  await (supabase.rpc as unknown as SupabaseRpc)('increment_public_web_page_view_count', { p_page_id: id }).then(() => undefined, () => undefined);
}

export function createPublicWebPage(input: Omit<PublicWebPage, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'>): PublicWebPage {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), viewCount: 0, createdAt: now, updatedAt: now };
}

export function createPublicWebPageItem(input: Omit<PublicWebPageItem, 'id' | 'createdAt' | 'updatedAt'>): PublicWebPageItem {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), createdAt: now, updatedAt: now };
}
