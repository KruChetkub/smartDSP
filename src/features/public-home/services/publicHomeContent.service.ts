import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { createUuid } from '../../../utils/uuid';
import { sanitizeImageUrlInput, sanitizeUrlInput } from '../../../utils/inputSecurity';

export type PublicHomeContentSection = string;
export type PublicHomeTargetView = 'plans' | 'performance' | 'research';
export type PublicHomeContentStatus = 'draft' | 'published';
export type PublicHomeIconKey = 'landmark' | 'target' | 'file-chart' | 'briefcase' | 'shield' | 'clipboard' | 'coins' | 'microscope';
export type PublicHomeColorKey = 'blue' | 'emerald' | 'violet' | 'orange' | 'rose' | 'teal';

export type PublicHomeContentItem = {
  id: string;
  section: PublicHomeContentSection;
  title: string;
  description: string;
  actionLabel: string;
  targetView: PublicHomeTargetView;
  iconKey: PublicHomeIconKey;
  colorKey: PublicHomeColorKey;
  logoUrl: string;
  pdfUrl: string;
  sortOrder: number;
  status: PublicHomeContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type PublicHomeContentRow = {
  id: string;
  section: PublicHomeContentSection;
  title: string;
  description: string;
  action_label: string;
  target_view: PublicHomeTargetView;
  icon_key: PublicHomeIconKey;
  color_key: PublicHomeColorKey;
  logo_url: string;
  pdf_url: string;
  sort_order: number;
  status: PublicHomeContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseFrom = (table: string) => any;
type SupabaseResult<T> = { data: T; error: unknown | null };

export const PUBLIC_HOME_CONTENT_UPDATED_EVENT = 'smartdsp-public-home-content-updated';

export const defaultPublicHomeContent: PublicHomeContentItem[] = [
  { id: 'default-plan-1', section: 'plan', title: 'แผนระดับ 1', description: 'ยุทธศาสตร์ชาติและกรอบทิศทางระดับประเทศ', actionLabel: 'รายละเอียด', targetView: 'plans', iconKey: 'landmark', colorKey: 'blue', logoUrl: '', pdfUrl: '', sortOrder: 10, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-plan-2', section: 'plan', title: 'แผนระดับ 2', description: 'แผนแม่บท แผนปฏิรูปประเทศ และแผนพัฒนาระดับชาติ', actionLabel: 'รายละเอียด', targetView: 'plans', iconKey: 'target', colorKey: 'emerald', logoUrl: '', pdfUrl: '', sortOrder: 20, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-plan-3', section: 'plan', title: 'แผนระดับ 3', description: 'แผนปฏิบัติราชการและแผนเฉพาะด้าน', actionLabel: 'รายละเอียด', targetView: 'plans', iconKey: 'file-chart', colorKey: 'violet', logoUrl: '', pdfUrl: '', sortOrder: 30, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-plan-4', section: 'plan', title: 'นโยบายผู้บริหาร', description: 'กรอบนโยบายและทิศทางการบริหารกรมควบคุมโรค', actionLabel: 'รายละเอียด', targetView: 'plans', iconKey: 'briefcase', colorKey: 'orange', logoUrl: '', pdfUrl: '', sortOrder: 40, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-policy-1', section: 'policy', title: 'แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ', description: 'แผนงานและกรอบดำเนินงานที่เชื่อมโยงนโยบายสู่การปฏิบัติของกรมควบคุมโรค', actionLabel: 'เปิดคลังแผนงาน', targetView: 'plans', iconKey: 'shield', colorKey: 'rose', logoUrl: '', pdfUrl: '', sortOrder: 10, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-policy-2', section: 'policy', title: 'นโยบายผู้บริหาร', description: 'รวบรวมนโยบายสำคัญ แนวทางบริหาร และสารจากผู้บริหารสำหรับใช้ขับเคลื่อนภารกิจ', actionLabel: 'อ่านนโยบาย', targetView: 'plans', iconKey: 'briefcase', colorKey: 'orange', logoUrl: '', pdfUrl: '', sortOrder: 20, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-policy-3', section: 'policy', title: 'แนวทางการดำเนินงานป้องกันควบคุมโรค', description: 'ผลการดำเนินงานสำคัญ รายงานประจำปี และแนวทางสำหรับการติดตามผลการปฏิบัติงาน', actionLabel: 'ดูผลการดำเนินงาน', targetView: 'performance', iconKey: 'clipboard', colorKey: 'blue', logoUrl: '', pdfUrl: '', sortOrder: 30, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
  { id: 'default-policy-4', section: 'policy', title: 'งบประมาณและแผนปฏิบัติราชการประจำปี', description: 'เอกสารงบประมาณ แผนปฏิบัติราชการ และข้อมูลประกอบการบริหารทรัพยากรประจำปี', actionLabel: 'ดูแผนและเอกสาร', targetView: 'plans', iconKey: 'coins', colorKey: 'teal', logoUrl: '', pdfUrl: '', sortOrder: 40, status: 'published', createdBy: null, updatedBy: null, createdAt: '', updatedAt: '' },
];

const selectColumns = 'id, section, title, description, action_label, target_view, icon_key, color_key, logo_url, pdf_url, sort_order, status, created_by, updated_by, created_at, updated_at';

function contentTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_home_content_items');
}

function mapRow(row: PublicHomeContentRow): PublicHomeContentItem {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    description: row.description || '',
    actionLabel: row.action_label || 'รายละเอียด',
    targetView: row.target_view,
    iconKey: row.icon_key,
    colorKey: row.color_key,
    logoUrl: row.logo_url || '',
    pdfUrl: row.pdf_url || '',
    sortOrder: row.sort_order,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapToRow(item: PublicHomeContentItem) {
  return {
    id: item.id,
    section: item.section,
    title: item.title.trim(),
    description: item.description.trim(),
    action_label: item.actionLabel.trim() || 'รายละเอียด',
    target_view: item.targetView,
    icon_key: item.iconKey,
    color_key: item.colorKey,
    logo_url: sanitizeImageUrlInput(item.logoUrl, { fieldName: 'ลิงก์โลโก้', maxLength: 2048 }) || '',
    pdf_url: sanitizeUrlInput(item.pdfUrl, { fieldName: 'ลิงก์เอกสาร PDF', maxLength: 2048 }) || '',
    sort_order: Math.max(1, Math.round(item.sortOrder)),
    status: item.status,
    created_by: item.createdBy,
    updated_by: item.updatedBy,
  };
}

export function comparePublicHomeContent(first: PublicHomeContentItem, second: PublicHomeContentItem) {
  const sectionOrder = first.section === second.section ? 0 : first.section === 'plan' ? -1 : 1;
  return sectionOrder || first.sortOrder - second.sortOrder || first.title.localeCompare(second.title, 'th');
}

export async function loadPublicHomeContent() {
  const { data } = await runSupabaseQuery<SupabaseResult<PublicHomeContentRow[]>>(
    contentTable().select(selectColumns).order('section').order('sort_order').order('created_at'),
    'โหลดข้อมูลหน้า Home',
  );
  return ((data || []) as PublicHomeContentRow[]).map(mapRow).sort(comparePublicHomeContent);
}

export async function loadPublicHomeContentOrDefaults() {
  try {
    const items = await loadPublicHomeContent();
    return items.length > 0 ? items : defaultPublicHomeContent;
  } catch {
    return defaultPublicHomeContent;
  }
}

export async function savePublicHomeContent(item: PublicHomeContentItem) {
  const row = mapToRow(item);
  const { data: updatedData } = await runSupabaseQuery<SupabaseResult<PublicHomeContentRow | null>>(
    contentTable().update(row).eq('id', item.id).select(selectColumns).maybeSingle(),
    'แก้ไขข้อมูลหน้า Home',
  );

  const savedRow = updatedData || (await runSupabaseQuery<SupabaseResult<PublicHomeContentRow>>(
    contentTable().insert(row).select(selectColumns).single(),
    'เพิ่มข้อมูลหน้า Home',
  )).data;
  const savedItem = mapRow(savedRow);
  window.dispatchEvent(new CustomEvent(PUBLIC_HOME_CONTENT_UPDATED_EVENT, { detail: savedItem }));
  return savedItem;
}

export async function updatePublicHomeContentStatus(id: string, status: PublicHomeContentStatus, userId: string) {
  const { data } = await runSupabaseQuery<SupabaseResult<PublicHomeContentRow>>(
    contentTable().update({ status, updated_by: userId }).eq('id', id).select(selectColumns).single(),
    'เปลี่ยนสถานะข้อมูลหน้า Home',
  );
  const savedItem = mapRow(data);
  window.dispatchEvent(new CustomEvent(PUBLIC_HOME_CONTENT_UPDATED_EVENT, { detail: savedItem }));
  return savedItem;
}

export function createPublicHomeContent(input: Omit<PublicHomeContentItem, 'id' | 'createdAt' | 'updatedAt'>): PublicHomeContentItem {
  const now = new Date().toISOString();
  return { ...input, id: createUuid(), createdAt: now, updatedAt: now };
}
