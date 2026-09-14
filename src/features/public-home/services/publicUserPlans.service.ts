import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { createUuid } from '../../../utils/uuid';
import { sanitizeImageUrlInput } from '../../../utils/inputSecurity';
import type { SiteContentPlanCard } from '../../site-content/types/siteContent.types';

export type PublicUserPlanCategory = string;

export type PublicUserPlan = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerWorkGroup: string | null;
  category: PublicUserPlanCategory;
  sortOrder: number;
  card: SiteContentPlanCard;
  createdAt: string;
  updatedAt: string;
};

type PublicUserPlansDocument = {
  plans: PublicUserPlan[];
};

type PublicUserPlanRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_work_group: string | null;
  category: string;
  sort_order: number | null;
  title: string;
  subtitle: string;
  description: string;
  icon_key: SiteContentPlanCard['iconKey'];
  color: string;
  action_label: string;
  pdf_url: string;
  cover_image_url: string;
  cover_image_layout: SiteContentPlanCard['coverImageLayout'];
  status: SiteContentPlanCard['status'];
  created_at: string;
  updated_at: string;
};

const PUBLIC_USER_PLANS_STORAGE_KEY = 'ptdms.publicUserPlans.v2';
export const PUBLIC_USER_PLANS_UPDATED_EVENT = 'ptdms-public-user-plans-updated';

const categoryColorMap: Record<string, string> = {
  'plan-level-1': 'bg-blue-600',
  'plan-level-2': 'bg-emerald-600',
  'plan-level-3': 'bg-violet-600',
  'annual-budget-document': 'bg-cyan-600',
  'action-plan': 'bg-teal-600',
  'executive-policy': 'bg-orange-500',
  other: 'bg-rose-500',
};

const categorySortIndexMap: Record<string, number> = {
  'plan-level-1': 0,
  'plan-level-2': 1,
  'plan-level-3': 2,
  'executive-policy': 3,
  'annual-budget-document': 4,
  'action-plan': 5,
  other: 6,
};

type SupabaseFrom = (table: string) => any;

type SupabaseDataResult<T> = {
  data: T;
  error: unknown | null;
};

export function getPublicUserPlanCategoryColor(category: PublicUserPlanCategory) {
  return categoryColorMap[category] || 'bg-blue-600';
}

export function getPublicUserPlanCategorySortIndex(category: PublicUserPlanCategory) {
  return categorySortIndexMap[category] ?? Number.MAX_SAFE_INTEGER;
}

export function normalizePublicUserPlanCategory(category: string | null | undefined): PublicUserPlanCategory {
  return category?.trim() || 'other';
}

export function comparePublicUserPlans(first: PublicUserPlan, second: PublicUserPlan) {
  const categoryCompare = getPublicUserPlanCategorySortIndex(first.category) - getPublicUserPlanCategorySortIndex(second.category);
  if (categoryCompare !== 0) return categoryCompare;

  const sortCompare = first.sortOrder - second.sortOrder;
  if (sortCompare !== 0) return sortCompare;

  return second.updatedAt.localeCompare(first.updatedAt);
}

function publicUserPlansTable() {
  return (supabase.from as unknown as SupabaseFrom)('public_user_plans');
}

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createId() {
  return createUuid();
}

function normalizeSortOrder(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
}

function normalizePlan(plan: PublicUserPlan): PublicUserPlan {
  const category = normalizePublicUserPlanCategory(plan.category);

  return {
    ...plan,
    category,
    sortOrder: normalizeSortOrder(plan.sortOrder),
    ownerWorkGroup: plan.ownerWorkGroup ?? null,
    card: {
      ...plan.card,
      title: plan.card.title || 'ยังไม่ระบุชื่อแผน',
      subtitle: plan.card.subtitle || '',
      description: plan.card.description || '',
      iconKey: plan.card.iconKey || 'file',
      color: plan.card.color || getPublicUserPlanCategoryColor(category),
      actionLabel: plan.card.actionLabel || 'รายละเอียด',
      pdfUrl: plan.card.pdfUrl || '',
      coverImageUrl: plan.card.coverImageUrl || '',
      coverImageLayout: plan.card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait',
      uploadedFileName: plan.card.uploadedFileName || '',
      status: plan.card.status === 'published' ? 'published' : 'draft',
    },
  };
}

function normalizePlansDocument(content: Partial<PublicUserPlansDocument> | null | undefined): PublicUserPlansDocument {
  const plans = Array.isArray(content?.plans) ? content.plans : [];

  return {
    plans: plans
      .filter((plan): plan is PublicUserPlan => Boolean(plan?.id && plan?.ownerUserId && plan?.card))
      .map(normalizePlan),
  };
}

function mapRowToPlan(row: PublicUserPlanRow): PublicUserPlan {
  return normalizePlan({
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    ownerWorkGroup: row.owner_work_group,
    category: normalizePublicUserPlanCategory(row.category),
    sortOrder: normalizeSortOrder(row.sort_order),
    card: {
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      iconKey: row.icon_key || 'file',
      color: row.color,
      actionLabel: row.action_label,
      pdfUrl: row.pdf_url,
      coverImageUrl: row.cover_image_url,
      coverImageLayout: row.cover_image_layout === 'landscape' ? 'landscape' : 'portrait',
      uploadedFileName: '',
      status: row.status === 'published' ? 'published' : 'draft',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapPlanToRow(plan: PublicUserPlan) {
  const normalized = normalizePlan(plan);

  return {
    id: normalized.id,
    owner_user_id: normalized.ownerUserId,
    owner_name: normalized.ownerName,
    owner_work_group: normalized.ownerWorkGroup,
    category: normalized.category,
    sort_order: normalized.sortOrder,
    title: normalized.card.title,
    subtitle: normalized.card.subtitle,
    description: normalized.card.description || '',
    icon_key: normalized.card.iconKey,
    color: normalized.card.color || getPublicUserPlanCategoryColor(normalized.category),
    action_label: normalized.card.actionLabel,
    pdf_url: normalized.card.pdfUrl,
    cover_image_url: sanitizeImageUrlInput(normalized.card.coverImageUrl, { fieldName: 'ลิงก์ภาพหน้าปก', maxLength: 2048 }) || '',
    cover_image_layout: normalized.card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait',
    status: normalized.card.status === 'published' ? 'published' : 'draft',
  };
}

function loadPublicUserPlansFromLocal() {
  if (!isBrowserStorageAvailable()) {
    return { plans: [] } satisfies PublicUserPlansDocument;
  }

  const rawValue = window.localStorage.getItem(PUBLIC_USER_PLANS_STORAGE_KEY);
  if (!rawValue) {
    return { plans: [] } satisfies PublicUserPlansDocument;
  }

  try {
    return normalizePlansDocument(JSON.parse(rawValue) as Partial<PublicUserPlansDocument>);
  } catch {
    return { plans: [] } satisfies PublicUserPlansDocument;
  }
}

function savePublicUserPlansToLocal(document: PublicUserPlansDocument) {
  if (!isBrowserStorageAvailable()) return;

  const normalized = normalizePlansDocument(document);
  window.localStorage.setItem(PUBLIC_USER_PLANS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(PUBLIC_USER_PLANS_UPDATED_EVENT, { detail: normalized }));
}

const selectColumns = 'id, owner_user_id, owner_name, owner_work_group, category, sort_order, title, subtitle, description, icon_key, color, action_label, pdf_url, cover_image_url, cover_image_layout, status, created_at, updated_at';

async function loadPublicUserPlansFromSupabase() {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PublicUserPlanRow[]>>(
    publicUserPlansTable()
      .select(selectColumns)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false }),
    'โหลดแผนของผู้ใช้จาก Supabase',
  );

  return { plans: ((data || []) as PublicUserPlanRow[]).map(mapRowToPlan).sort(comparePublicUserPlans) } satisfies PublicUserPlansDocument;
}

async function savePublicUserPlanToSupabase(plan: PublicUserPlan) {
  const row = mapPlanToRow(plan);
  const { data: updatedData } = await runSupabaseQuery<SupabaseDataResult<PublicUserPlanRow | null>>(
    publicUserPlansTable()
      .update(row)
      .eq('id', plan.id)
      .select(selectColumns)
      .maybeSingle(),
    'แก้ไขแผนของผู้ใช้ใน Supabase',
  );

  if (updatedData) {
    return mapRowToPlan(updatedData);
  }

  const { data: insertedData } = await runSupabaseQuery<SupabaseDataResult<PublicUserPlanRow>>(
    publicUserPlansTable()
      .insert(row)
      .select(selectColumns)
      .single(),
    'เพิ่มแผนของผู้ใช้ไป Supabase',
  );

  return mapRowToPlan(insertedData);
}

async function updatePublicUserPlanStatusInSupabase(planId: string, status: 'published' | 'draft') {
  const { data } = await runSupabaseQuery<SupabaseDataResult<PublicUserPlanRow>>(
    publicUserPlansTable()
      .update({ status })
      .eq('id', planId)
      .select(selectColumns)
      .single(),
    'อัปเดตสถานะแผนของผู้ใช้ใน Supabase',
  );

  return mapRowToPlan(data as unknown as PublicUserPlanRow);
}

export async function loadPublicUserPlans() {
  try {
    const document = await loadPublicUserPlansFromSupabase();
    savePublicUserPlansToLocal(document);
    return document;
  } catch {
    return loadPublicUserPlansFromLocal();
  }
}

export async function savePublicUserPlan(plan: PublicUserPlan) {
  try {
    const savedPlan = await savePublicUserPlanToSupabase(plan);
    const currentDocument = loadPublicUserPlansFromLocal();
    const nextDocument = normalizePlansDocument({ plans: [savedPlan, ...currentDocument.plans.filter((currentPlan) => currentPlan.id !== savedPlan.id)] });
    savePublicUserPlansToLocal({ plans: nextDocument.plans.sort(comparePublicUserPlans) });
    return { source: 'supabase' as const, plan: savedPlan };
  } catch {
    const currentDocument = loadPublicUserPlansFromLocal();
    const nextDocument = normalizePlansDocument({ plans: [plan, ...currentDocument.plans.filter((currentPlan) => currentPlan.id !== plan.id)] });
    savePublicUserPlansToLocal({ plans: nextDocument.plans.sort(comparePublicUserPlans) });
    return { source: 'local' as const, plan: normalizePlan(plan) };
  }
}

export async function updatePublicUserPlanStatus(planId: string, status: 'published' | 'draft') {
  try {
    const savedPlan = await updatePublicUserPlanStatusInSupabase(planId, status);
    const currentDocument = loadPublicUserPlansFromLocal();
    const nextDocument = normalizePlansDocument({
      plans: currentDocument.plans.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan)),
    });
    savePublicUserPlansToLocal({ plans: nextDocument.plans.sort(comparePublicUserPlans) });
    return { source: 'supabase' as const, plan: savedPlan };
  } catch {
    const currentDocument = loadPublicUserPlansFromLocal();
    const now = new Date().toISOString();
    const nextDocument = normalizePlansDocument({
      plans: currentDocument.plans.map((plan) =>
        plan.id === planId
          ? { ...plan, updatedAt: now, card: { ...plan.card, status } }
          : plan,
      ),
    });
    savePublicUserPlansToLocal({ plans: nextDocument.plans.sort(comparePublicUserPlans) });
    const plan = nextDocument.plans.find((currentPlan) => currentPlan.id === planId) || null;
    return { source: 'local' as const, plan };
  }
}

export function createPublicUserPlan(input: Omit<PublicUserPlan, 'id' | 'createdAt' | 'updatedAt'>): PublicUserPlan {
  const now = new Date().toISOString();

  return normalizePlan({
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  });
}
