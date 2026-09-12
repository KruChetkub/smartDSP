import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Edit3, FileText, Save, X } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import type { SiteContentPlanCoverLayout, SiteContentStatus } from '../../site-content/types/siteContent.types';
import { AdminCoverImageUpload } from './AdminCoverImageUpload';
import { AdminPublicPdfUpload } from './AdminPublicPdfUpload';
import { CoverImagePreview } from './CoverImagePreview';
import { PublicRepositoryEditModal } from './PublicRepositoryEditModal';
import { PublicRepositoryCategoryManager } from './PublicRepositoryCategoryManager';
import {
  findPublicRepositoryCategory,
  getDefaultRepositoryCategories,
  loadPublicRepositoryCategories,
  type PublicRepositoryCategory,
} from '../services/publicRepositoryCategories.service';
import {
  createPublicResearchItem,
  getResearchCategory,
  loadPublicResearchItems,
  savePublicResearchItem,
  updatePublicResearchItemStatus,
  type PublicResearchItem,
  type ResearchCategory,
} from '../services/publicResearchItems.service';

type FormState = {
  category: ResearchCategory;
  publicationYear: number;
  sortOrder: number;
  title: string;
  researcherNames: string;
  organization: string;
  'abstract': string;
  pdfUrl: string;
  coverImageUrl: string;
  coverImageLayout: SiteContentPlanCoverLayout;
  status: SiteContentStatus;
};

const PAGE_SIZE = 10;

const currentThaiYear = new Date().getFullYear() + 543;
const defaultForm: FormState = {
  category: 'r2r',
  publicationYear: currentThaiYear,
  sortOrder: 10,
  title: '',
  researcherNames: '',
  organization: '',
  abstract: '',
  pdfUrl: '',
  coverImageUrl: '',
  coverImageLayout: 'portrait',
  status: 'draft',
};

function toForm(item: PublicResearchItem): FormState {
  return {
    category: item.category,
    publicationYear: item.publicationYear,
    sortOrder: item.sortOrder,
    title: item.title,
    researcherNames: item.researcherNames,
    organization: item.organization,
    abstract: item.abstract,
    pdfUrl: item.pdfUrl,
    coverImageUrl: item.coverImageUrl,
    coverImageLayout: item.coverImageLayout,
    status: item.status,
  };
}

function isSafeOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function PublicResearchItemsManager() {
  const { user, profile } = useAuthStore();
  const [items, setItems] = useState<PublicResearchItem[]>([]);
  const [categories, setCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('research'));
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';
  const canUploadPdf = canManagePublicContent;
  const categoryOrder = useMemo(() => new Map(categories.map((category, index) => [category.key, index])), [categories]);
  const compareItems = (first: PublicResearchItem, second: PublicResearchItem) => {
    if (first.publicationYear !== second.publicationYear) return second.publicationYear - first.publicationYear;
    const categoryCompare = (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER)
      - (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryCompare || first.sortOrder - second.sortOrder || second.updatedAt.localeCompare(first.updatedAt);
  };
  const myItems = useMemo(
    () => canManagePublicContent ? [...items].sort(compareItems) : [],
    [canManagePublicContent, items, categoryOrder],
  );
  const activeCategories = categories.filter((category) => category.isActive || category.key === form.category);
  const selectedCategory = findPublicRepositoryCategory(categories, form.category);
  const currentCategory = selectedCategory || getResearchCategory(form.category);
  const totalPages = Math.max(1, Math.ceil(myItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pagedItems = myItems.slice(safeCurrentPage * PAGE_SIZE, safeCurrentPage * PAGE_SIZE + PAGE_SIZE);
  const editingItem = myItems.find((item) => item.id === editingId) || null;

  useEffect(() => {
    if (!canManagePublicContent) {
      setItems([]);
      return;
    }

    let mounted = true;
    Promise.all([loadPublicResearchItems(), loadPublicRepositoryCategories('research')])
      .then(([loadedItems, loadedCategories]) => { if (mounted) {
        setItems(loadedItems);
        setCategories(loadedCategories);
        setForm((current) => loadedCategories.some((category) => category.key === current.category && category.isActive)
          ? current
          : { ...current, category: loadedCategories.find((category) => category.isActive)?.key || current.category });
      } })
      .catch(() => { if (mounted) setError('ไม่สามารถโหลดข้อมูลงานวิจัยจาก Supabase ได้ กรุณาตรวจสอบ migration และการเชื่อมต่อ'); });
    return () => { mounted = false; };
  }, [canManagePublicContent]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  const updateForm = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setMessage(null);
    setError(null);
  };

  const startEdit = (item: PublicResearchItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setMessage(null);
    setError(null);
  };

  const handleCategoriesChange = (nextCategories: PublicRepositoryCategory[]) => {
    setCategories(nextCategories);
    setForm((current) => nextCategories.some((category) => category.key === current.category && (category.isActive || Boolean(editingId)))
      ? current
      : { ...current, category: nextCategories.find((category) => category.isActive)?.key || 'other' });
  };

  const handleSave = async () => {
    if (!user || !canManagePublicContent) return;
    if (!form.title.trim()) {
      setError('กรุณาระบุชื่องานวิจัย');
      return;
    }
    if (form.publicationYear < 2400 || form.publicationYear > 2700) {
      setError('ปีที่เผยแพร่ต้องอยู่ระหว่าง พ.ศ. 2400-2700');
      return;
    }
    if (!isSafeOptionalUrl(form.pdfUrl) || !isSafeOptionalUrl(form.coverImageUrl)) {
      setError('ลิงก์เอกสารและภาพปกต้องเป็น http:// หรือ https:// เท่านั้น');
      return;
    }

    const category = currentCategory;
    const nextItem = editingItem
      ? {
          ...editingItem,
          ...form,
          color: category.color,
          actionLabel: 'เปิดเอกสารงานวิจัย',
        }
      : createPublicResearchItem({
          ownerUserId: user.id,
          ownerName: profile?.full_name || user.email || 'ผู้ใช้งานระบบ',
          ownerWorkGroup: profile?.work_group || profile?.department || null,
          ...form,
          color: category.color,
          actionLabel: 'เปิดเอกสารงานวิจัย',
        });

    try {
      setIsSaving(true);
      setError(null);
      const saved = await savePublicResearchItem(nextItem);
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort(compareItems));
      setForm(defaultForm);
      setEditingId(null);
      if (!editingItem) setCurrentPage(0);
      setMessage(editingItem ? 'แก้ไขงานวิจัยเรียบร้อย และบันทึกประวัติไว้แล้ว' : 'เพิ่มงานวิจัยลง Supabase เรียบร้อย');
    } catch {
      setError('บันทึกไม่สำเร็จ ข้อมูลยังไม่ถูกยืนยันลง Supabase กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PublicResearchItem) => {
    if (!user || !canManagePublicContent) return;
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      const saved = await updatePublicResearchItemStatus(item.id, nextStatus);
      setItems((current) => current.map((currentItem) => currentItem.id === saved.id ? saved : currentItem).sort(compareItems));
      setMessage(nextStatus === 'published' ? 'เผยแพร่งานวิจัยเรียบร้อย' : 'เปลี่ยนงานวิจัยเป็นฉบับร่างแล้ว');
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะงานวิจัยได้');
    }
  };

  const getItemsInGroup = (item: PublicResearchItem) => myItems.filter(
    (currentItem) => currentItem.category === item.category && currentItem.publicationYear === item.publicationYear,
  );

  const canMoveItem = (item: PublicResearchItem, direction: -1 | 1) => {
    const group = getItemsInGroup(item);
    const index = group.findIndex((currentItem) => currentItem.id === item.id);
    return index >= 0 && Boolean(group[index + direction]);
  };

  const moveItem = async (item: PublicResearchItem, direction: -1 | 1) => {
    if (!user || !canManagePublicContent) return;
    const group = getItemsInGroup(item);
    const index = group.findIndex((currentItem) => currentItem.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= group.length) return;

    const reordered = [...group];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      setIsSaving(true);
      setError(null);
      const savedItems = await Promise.all(reordered.map((currentItem, itemIndex) => savePublicResearchItem({
        ...currentItem,
        sortOrder: (itemIndex + 1) * 10,
        updatedAt: new Date().toISOString(),
      })));
      const savedById = new Map(savedItems.map((currentItem) => [currentItem.id, currentItem]));
      setItems((current) => current.map((currentItem) => savedById.get(currentItem.id) || currentItem).sort(compareItems));
      setMessage('ย้ายลำดับงานวิจัยเรียบร้อย');
    } catch {
      setError('ไม่สามารถย้ายลำดับงานวิจัยได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !canManagePublicContent) {
    return <section className="min-h-[calc(100vh-4rem)] bg-white p-8 text-sm text-slate-600">เฉพาะ Admin และ Super Admin เท่านั้นที่เข้าถึงหน้าจัดการงานวิจัยได้</section>;
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-emerald-700">Research Publishing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">เพิ่มงานวิจัยของฉัน</h1>

        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div><h2 className="text-lg font-semibold text-slate-950">{editingItem ? 'แก้ไขงานวิจัย' : 'ข้อมูลงานวิจัย'}</h2><p className="mt-1 text-sm text-slate-500">ข้อมูลจะบันทึกลง Supabase และเก็บประวัติทุกครั้งที่แก้ไข</p></div>
            {editingItem ? <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600" title="ยกเลิกแก้ไข"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid content-start gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="text-sm font-medium text-slate-700">ประเภทงานวิจัย</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as ResearchCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>{user ? <PublicRepositoryCategoryManager repositoryType="research" title="ประเภทงานวิจัย" userId={user.id} categories={categories} onCategoriesChange={handleCategoriesChange} /> : null}</div>
                <label className="block"><span className="text-sm font-medium text-slate-700">ปีที่เผยแพร่</span><input type="number" min={2400} max={2700} value={form.publicationYear} onChange={(event) => updateForm('publicationYear', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              </div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ชื่องานวิจัย</span><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">ผู้วิจัย/ผู้จัดทำ</span><input value={form.researcherNames} onChange={(event) => updateForm('researcherNames', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">หน่วยงาน</span><input value={form.organization} onChange={(event) => updateForm('organization', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">บทคัดย่อ/รายละเอียด</span><textarea rows={4} value={form.abstract} onChange={(event) => updateForm('abstract', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            </div>

            <div className="grid content-start gap-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input type="url" value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {canUploadPdf ? (
                <AdminPublicPdfUpload
                  userId={user.id}
                  folder="research"
                  disabled={isSaving || isUploadingCover}
                  onUploadingChange={(uploading) => {
                    setIsUploadingPdf(uploading);
                    if (uploading) setError(null);
                  }}
                  onError={setError}
                  onUploaded={(upload) => {
                    setForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() && !current.coverImageUrl.includes('/public-home-documents/') ? current.coverImageUrl : upload.coverImageUrl }));
                    setError(null);
                  }}
                />
              ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input type="url" value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {canUploadPdf ? (
                <AdminCoverImageUpload
                  disabled={isSaving || isUploadingPdf}
                  onUploadingChange={(uploading) => {
                    setIsUploadingCover(uploading);
                    if (uploading) setError(null);
                  }}
                  onError={setError}
                  onUploaded={(imageUrl) => {
                    setForm((current) => ({ ...current, coverImageUrl: imageUrl }));
                    setError(null);
                  }}
                />
              ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Math.max(1, Number(event.target.value)))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
                <div className="block"><span className="text-sm font-medium text-slate-700">สถานะ</span><button type="button" aria-pressed={form.status === 'published'} onClick={() => updateForm('status', form.status === 'published' ? 'draft' : 'published')} className={`mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${form.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}><span className={`h-2.5 w-2.5 rounded-full ${form.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />{form.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'portrait' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">360 x 640 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวตั้ง</span></button>
                <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${form.coverImageLayout === 'landscape' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="block text-sm font-semibold">640 x 360 px</span><span className="mt-1 block text-xs font-medium text-current/70">ภาพแนวนอน</span></button>
              </div>
              <label className="hidden">
                <span>สถานะ</span>
                <select value={form.status} onChange={(event) => updateForm('status', event.target.value as SiteContentStatus)}>
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-4">
            <CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} />
          </div>
          <button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploadingPdf || isUploadingCover} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มงานวิจัย'}</button>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        </div>

        <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">รายการที่นำเข้าแล้ว</h2><p className="mt-1 text-sm text-slate-500">แสดงครั้งละ 10 รายการ เรียงตามปี ประเภทงานวิจัย และลำดับการแสดงผล</p></div>
            <p className="text-sm font-semibold text-slate-600">ทั้งหมด {myItems.length} รายการ</p>
          </div>
          {myItems.length ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"><tr><th className="w-16 px-3 py-3">ลำดับ</th><th className="min-w-56 px-3 py-3">ชื่องานวิจัย</th><th className="min-w-40 px-3 py-3">ประเภทงานวิจัย</th><th className="w-28 px-3 py-3">ปีเผยแพร่</th><th className="w-28 px-3 py-3">ลำดับแสดงผล</th><th className="min-w-28 px-3 py-3">สถานะ</th><th className="min-w-48 px-3 py-3">จัดการ</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedItems.map((item, index) => (
                      <tr key={item.id} className={editingId === item.id ? 'bg-brand-50/70' : undefined}>
                        <td className="px-3 py-3 font-semibold text-slate-700">{safeCurrentPage * PAGE_SIZE + index + 1}</td>
                        <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white ${findPublicRepositoryCategory(categories, item.category)?.color || item.color}`}><FileText className="h-4 w-4" /></span><div className="min-w-0"><p className="max-w-md truncate font-semibold text-slate-950">{item.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{item.researcherNames || item.organization || '-'}</p></div></div></td>
                        <td className="px-3 py-3 text-slate-600">{findPublicRepositoryCategory(categories, item.category)?.label || item.category}</td>
                        <td className="px-3 py-3 text-slate-600">{item.publicationYear}</td>
                        <td className="px-3 py-3 font-semibold text-slate-700">{item.sortOrder}</td>
                        <td className="px-3 py-3"><button type="button" onClick={() => void toggleStatus(item)} className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${item.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button></td>
                        <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void moveItem(item, -1)} disabled={!canMoveItem(item, -1) || isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40" title="เลื่อนขึ้นในประเภทและปีเดียวกัน"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => void moveItem(item, 1)} disabled={!canMoveItem(item, 1) || isSaving} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40" title="เลื่อนลงในประเภทและปีเดียวกัน"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => startEdit(item)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><Edit3 className="h-4 w-4" />แก้ไข</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">หน้า {safeCurrentPage + 1} จาก {totalPages}</p><div className="flex gap-2"><button type="button" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={safeCurrentPage === 0} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />ก่อนหน้า</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={safeCurrentPage >= totalPages - 1} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">ถัดไป<ChevronRight className="h-4 w-4" /></button></div></div>
            </>
          ) : <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">ยังไม่มีงานวิจัยที่นำเข้า</div>}
        </div>
      </div>
      <PublicRepositoryEditModal
        isOpen={Boolean(editingItem)}
        title="แก้ไขงานวิจัย"
        onClose={resetForm}
        onSave={() => void handleSave()}
        isSaving={isSaving}
        saveDisabled={isUploadingPdf || isUploadingCover}
        error={error}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="text-sm font-medium text-slate-700">ประเภทงานวิจัย</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value as ResearchCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{activeCategories.map((category) => <option key={category.id} value={category.key}>{category.label}</option>)}</select></label>{user ? <PublicRepositoryCategoryManager repositoryType="research" title="ประเภทงานวิจัย" userId={user.id} categories={categories} onCategoriesChange={handleCategoriesChange} /> : null}</div>
              <label className="block"><span className="text-sm font-medium text-slate-700">ปีที่เผยแพร่</span><input type="number" min={2400} max={2700} value={form.publicationYear} onChange={(event) => updateForm('publicationYear', Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            </div>
            <label className="block"><span className="text-sm font-medium text-slate-700">ชื่องานวิจัย</span><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">ผู้วิจัย/ผู้จัดทำ</span><input value={form.researcherNames} onChange={(event) => updateForm('researcherNames', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">หน่วยงาน</span><input value={form.organization} onChange={(event) => updateForm('organization', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">บทคัดย่อ/รายละเอียด</span><textarea rows={4} value={form.abstract} onChange={(event) => updateForm('abstract', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
          </div>
          <div className="grid content-start gap-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์เอกสาร PDF</span><input value={form.pdfUrl} onChange={(event) => updateForm('pdfUrl', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              {user ? <AdminPublicPdfUpload userId={user.id} folder="research" disabled={isSaving || isUploadingCover} onUploadingChange={setIsUploadingPdf} onError={setError} onUploaded={(upload) => setForm((current) => ({ ...current, pdfUrl: upload.pdfUrl, coverImageUrl: current.coverImageUrl.trim() && !current.coverImageUrl.includes('/public-home-documents/') ? current.coverImageUrl : upload.coverImageUrl }))} /> : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block"><span className="text-sm font-medium text-slate-700">ลิงก์ภาพหน้าปก</span><input value={form.coverImageUrl} onChange={(event) => updateForm('coverImageUrl', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
              <AdminCoverImageUpload disabled={isSaving || isUploadingPdf} onUploadingChange={setIsUploadingCover} onError={setError} onUploaded={(imageUrl) => updateForm('coverImageUrl', imageUrl)} />
            </div>
            <label className="block"><span className="text-sm font-medium text-slate-700">ลำดับการแสดงผล</span><input type="number" min={1} value={form.sortOrder} onChange={(event) => updateForm('sortOrder', Math.max(1, Number(event.target.value)))} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => updateForm('coverImageLayout', 'portrait')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${form.coverImageLayout === 'portrait' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>360 x 640 px<br />ภาพแนวตั้ง</button>
              <button type="button" onClick={() => updateForm('coverImageLayout', 'landscape')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${form.coverImageLayout === 'landscape' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>640 x 360 px<br />ภาพแนวนอน</button>
            </div>
          </div>
        </div>
        <div className="mt-4"><CoverImagePreview imageUrl={form.coverImageUrl} pdfUrl={form.pdfUrl} layout={form.coverImageLayout} title={form.title} /></div>
      </PublicRepositoryEditModal>
      <ConfirmModal
        isOpen={Boolean(message)}
        onClose={() => setMessage(null)}
        onConfirm={() => setMessage(null)}
        title="ดำเนินการสำเร็จ"
        message={message || ''}
        confirmLabel="ตกลง"
        variant="success"
        showCancelButton={false}
      />
    </section>
  );
}
