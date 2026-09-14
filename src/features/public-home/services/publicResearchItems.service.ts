import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { createUuid } from '../../../utils/uuid';
import { sanitizeImageUrlInput } from '../../../utils/inputSecurity';
import type { SiteContentPlanCoverLayout, SiteContentStatus } from '../../site-content/types/siteContent.types';

export type ResearchCategory = string;

export type PublicResearchItem = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerWorkGroup: string | null;
  category: ResearchCategory;
  publicationYear: number;
  sortOrder: number;
  title: string;
  researcherNames: string;
  organization: string;
  'abstract': string;
  color: string;
  actionLabel: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
  createdAt: string;
  updatedAt: string;
};

export const researchCategoryOptions: Array<{
  value: ResearchCategory;
  label: string;
  color: string;
  tone: 'emerald' | 'blue' | 'violet' | 'rose';
}> = [
  { value: 'r2r', label: 'งานวิจัยจากงานประจำ (R2R)', color: 'bg-emerald-600', tone: 'emerald' },
  { value: 'innovation', label: 'นวัตกรรมและการพัฒนางาน', color: 'bg-sky-600', tone: 'blue' },
  { value: 'evaluation', label: 'การประเมินผล', color: 'bg-violet-600', tone: 'violet' },
  { value: 'other', label: 'งานวิจัยอื่น ๆ', color: 'bg-rose-500', tone: 'rose' },
];

type ResearchRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_work_group: string | null;
  category: string;
  publication_year: number;
  sort_order: number;
  title: string;
  researcher_names: string;
  organization: string;
  'abstract': string;
  color: string;
  action_label: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: string;
  status: SiteContentStatus;
  created_at: string;
  updated_at: string;
};

type SupabaseFrom = (table: string) => any;
type SupabaseDataResult<T> = { data: T; error: unknown | null };

const selectColumns = 'id, owner_user_id, owner_name, owner_work_group, category, publication_year, sort_order, title, researcher_names, organization, abstract, color, action_label, pdf_url, cover_image_url, cover_image_layout, status, created_at, updated_at';

function researchItemsTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_research_items');
}

function normalizeCategory(value: string): ResearchCategory {
  return value?.trim() || 'other';
}

export function getResearchCategory(category: ResearchCategory) {
  return researchCategoryOptions.find((option) => option.value === category) || researchCategoryOptions[3];
}

function mapRow(row: ResearchRow): PublicResearchItem {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    ownerWorkGroup: row.owner_work_group,
    category: normalizeCategory(row.category),
    publicationYear: row.publication_year,
    sortOrder: row.sort_order,
    title: row.title,
    researcherNames: row.researcher_names,
    organization: row.organization,
    abstract: row.abstract,
    color: row.color,
    actionLabel: row.action_label,
    pdfUrl: row.pdf_url,
    coverImageUrl: row.cover_image_url,
    coverImageLayout: row.cover_image_layout === 'landscape' ? 'landscape' : 'portrait',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(item: PublicResearchItem) {
  return {
    id: item.id,
    owner_user_id: item.ownerUserId,
    owner_name: item.ownerName,
    owner_work_group: item.ownerWorkGroup,
    category: item.category,
    publication_year: item.publicationYear,
    sort_order: item.sortOrder,
    title: item.title.trim(),
    researcher_names: item.researcherNames.trim(),
    organization: item.organization.trim(),
    abstract: item.abstract.trim(),
    icon_key: 'file',
    color: item.color || getResearchCategory(item.category).color,
    action_label: item.actionLabel.trim() || 'เปิดเอกสารงานวิจัย',
    pdf_url: item.pdfUrl.trim(),
    cover_image_url: sanitizeImageUrlInput(item.coverImageUrl, { fieldName: 'ลิงก์ภาพหน้าปก', maxLength: 2048 }) || '',
    cover_image_layout: item.coverImageLayout,
    status: item.status === 'published' ? 'published' : 'draft',
  };
}

export function compareResearchItems(first: PublicResearchItem, second: PublicResearchItem) {
  if (first.publicationYear !== second.publicationYear) return second.publicationYear - first.publicationYear;
  const categoryIndex = (category: ResearchCategory) => {
    const index = researchCategoryOptions.findIndex((option) => option.value === category);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return categoryIndex(first.category) - categoryIndex(second.category)
    || first.sortOrder - second.sortOrder
    || second.updatedAt.localeCompare(first.updatedAt);
}

export async function loadPublicResearchItems() {
  const { data } = await runSupabaseQuery<SupabaseDataResult<ResearchRow[]>>(
    researchItemsTable().select(selectColumns)
      .order('publication_year', { ascending: false })
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true }),
    'โหลดงานวิจัยจาก Supabase',
  );
  return ((data || []) as ResearchRow[]).map(mapRow).sort(compareResearchItems);
}

export async function savePublicResearchItem(item: PublicResearchItem) {
  const row = toRow(item);
  const { data: updatedData } = await runSupabaseQuery<SupabaseDataResult<ResearchRow | null>>(
    researchItemsTable().update(row).eq('id', item.id).select(selectColumns).maybeSingle(),
    'แก้ไขงานวิจัยใน Supabase',
  );

  if (updatedData) return mapRow(updatedData);

  const { data: insertedData } = await runSupabaseQuery<SupabaseDataResult<ResearchRow>>(
    researchItemsTable().insert(row).select(selectColumns).single(),
    'เพิ่มงานวิจัยไป Supabase',
  );
  return mapRow(insertedData);
}

export async function updatePublicResearchItemStatus(id: string, status: 'published' | 'draft') {
  const { data } = await runSupabaseQuery<SupabaseDataResult<ResearchRow>>(
    researchItemsTable().update({ status }).eq('id', id).select(selectColumns).single(),
    'อัปเดตสถานะงานวิจัย',
  );
  return mapRow(data as ResearchRow);
}

export function createPublicResearchItem(input: Omit<PublicResearchItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), createdAt: now, updatedAt: now } satisfies PublicResearchItem;
}
