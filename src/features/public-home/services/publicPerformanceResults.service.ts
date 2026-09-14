import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { createUuid } from '../../../utils/uuid';
import { sanitizeImageUrlInput } from '../../../utils/inputSecurity';
import type { SiteContentPlanCoverLayout, SiteContentPlanIconKey, SiteContentStatus } from '../../site-content/types/siteContent.types';

export type PerformanceResultCategory = string;

export type PublicPerformanceResult = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerWorkGroup: string | null;
  category: PerformanceResultCategory;
  fiscalYear: number;
  sortOrder: number;
  title: string;
  subtitle: string;
  description: string;
  iconKey: SiteContentPlanIconKey;
  color: string;
  actionLabel: string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
  createdAt: string;
  updatedAt: string;
};

export const performanceCategoryOptions: Array<{
  value: PerformanceResultCategory;
  label: string;
  color: string;
  tone: 'blue' | 'emerald' | 'violet' | 'orange' | 'rose';
}> = [
  { value: 'key-result', label: 'ผลการดำเนินงานสำคัญ', color: 'bg-sky-600', tone: 'blue' },
  { value: 'annual-report', label: 'รายงานประจำปี', color: 'bg-emerald-600', tone: 'emerald' },
  { value: 'achievement-report', label: 'รายงานผลสัมฤทธิ์', color: 'bg-cyan-600', tone: 'blue' },
  { value: 'risk-management-report', label: 'รายงานแผนบริหารความเสี่ยง', color: 'bg-orange-500', tone: 'orange' },
  { value: 'indicator-report', label: 'รายงานตัวชี้วัด', color: 'bg-violet-600', tone: 'violet' },
  { value: 'other', label: 'อื่น ๆ', color: 'bg-rose-500', tone: 'rose' },
];

type PerformanceResultRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_work_group: string | null;
  category: string;
  fiscal_year: number;
  sort_order: number;
  title: string;
  subtitle: string;
  description: string;
  icon_key: string;
  color: string;
  action_label: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: string;
  status: SiteContentStatus;
  created_at: string;
  updated_at: string;
};

const selectColumns = 'id, owner_user_id, owner_name, owner_work_group, category, fiscal_year, sort_order, title, subtitle, description, icon_key, color, action_label, pdf_url, cover_image_url, cover_image_layout, status, created_at, updated_at';

type SupabaseFrom = (table: string) => any;

type SupabaseDataResult<T> = {
  data: T;
  error: unknown | null;
};

function performanceResultsTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_performance_results');
}

function normalizeCategory(value: string): PerformanceResultCategory {
  return value?.trim() || 'other';
}

export function getPerformanceCategory(category: PerformanceResultCategory) {
  return performanceCategoryOptions.find((option) => option.value === category)
    || performanceCategoryOptions.find((option) => option.value === 'other')!;
}

function mapRow(row: PerformanceResultRow): PublicPerformanceResult {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    ownerWorkGroup: row.owner_work_group,
    category: normalizeCategory(row.category),
    fiscalYear: row.fiscal_year,
    sortOrder: row.sort_order,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    iconKey: (row.icon_key || 'growth') as SiteContentPlanIconKey,
    color: row.color,
    actionLabel: row.action_label,
    pdfUrl: row.pdf_url,
    coverImageUrl: row.cover_image_url,
    coverImageLayout: row.cover_image_layout === 'portrait' ? 'portrait' : 'landscape',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(result: PublicPerformanceResult) {
  return {
    id: result.id,
    owner_user_id: result.ownerUserId,
    owner_name: result.ownerName,
    owner_work_group: result.ownerWorkGroup,
    category: result.category,
    fiscal_year: result.fiscalYear,
    sort_order: result.sortOrder,
    title: result.title.trim(),
    subtitle: result.subtitle.trim(),
    description: result.description.trim(),
    icon_key: result.iconKey,
    color: result.color || getPerformanceCategory(result.category).color,
    action_label: result.actionLabel.trim() || 'ดูผลการดำเนินงาน',
    pdf_url: result.pdfUrl.trim(),
    cover_image_url: sanitizeImageUrlInput(result.coverImageUrl, { fieldName: 'ลิงก์ภาพหน้าปก', maxLength: 2048 }) || '',
    cover_image_layout: result.coverImageLayout,
    status: result.status === 'published' ? 'published' : 'draft',
  };
}

export function comparePerformanceResults(first: PublicPerformanceResult, second: PublicPerformanceResult) {
  const categoryIndex = (category: PerformanceResultCategory) => {
    const index = performanceCategoryOptions.findIndex((option) => option.value === category);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const categoryCompare = categoryIndex(first.category) - categoryIndex(second.category);
  if (categoryCompare !== 0) return categoryCompare;
  if (first.fiscalYear !== second.fiscalYear) return second.fiscalYear - first.fiscalYear;
  return first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt);
}

export async function loadPublicPerformanceResults() {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow[]>>(
    performanceResultsTable().select(selectColumns)
      .order('category', { ascending: true })
      .order('fiscal_year', { ascending: false })
      .order('sort_order', { ascending: true }),
    'โหลดผลการดำเนินงานสำคัญจาก Supabase',
  );
  return ((data || []) as PerformanceResultRow[]).map(mapRow).sort(comparePerformanceResults);
}

export async function savePublicPerformanceResult(result: PublicPerformanceResult) {
  const row = toRow(result);
  const { data: updatedData } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow | null>>(
    performanceResultsTable().update(row).eq('id', result.id).select(selectColumns).maybeSingle(),
    'แก้ไขผลการดำเนินงานสำคัญใน Supabase',
  );

  if (updatedData) return mapRow(updatedData);

  const { data: insertedData } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow>>(
    performanceResultsTable().insert(row).select(selectColumns).single(),
    'เพิ่มผลการดำเนินงานสำคัญไป Supabase',
  );
  return mapRow(insertedData);
}

export async function updatePublicPerformanceResultStatus(id: string, status: 'published' | 'draft') {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PerformanceResultRow>>(
    performanceResultsTable().update({ status }).eq('id', id).select(selectColumns).single(),
    'อัปเดตสถานะผลการดำเนินงานสำคัญ',
  );
  return mapRow(data as PerformanceResultRow);
}

export function createPublicPerformanceResult(input: Omit<PublicPerformanceResult, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), createdAt: now, updatedAt: now } satisfies PublicPerformanceResult;
}
