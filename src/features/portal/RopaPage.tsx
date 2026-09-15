import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { cn } from '../../utils/cn';
import { getSafeUserErrorMessage, reportClientError } from '../../utils/errorHandling';
import {
  listActiveRopaLinks,
  listRopaLinksForAdmin,
  saveRopaLinkSettings,
  uploadRopaLinkImage,
  type RopaLinkDraft,
} from './ropaLinks.service';

type RopaTab = 'links' | 'settings';

function createNewLink(sortOrder: number): RopaLinkDraft {
  return {
    title: '',
    description: null,
    linkUrl: '',
    iconUrl: null,
    iconPath: null,
    previewUrl: null,
    previewPath: null,
    isActive: true,
    sortOrder,
  };
}

function withAutomaticOrder(items: RopaLinkDraft[]) {
  return items.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));
}

export function RopaPage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const canManage = profile?.role === 'super_admin' || profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<RopaTab>('links');
  const [links, setLinks] = useState<RopaLinkDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  useAuditPageAccess({ module: 'ropa', action: 'ropa_page_access', route: '/ropa' });

  const loadLinks = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = canManage
        ? await listRopaLinksForAdmin()
        : (await listActiveRopaLinks()).map((link) => ({
            id: link.id,
            title: link.title,
            description: link.description,
            linkUrl: link.link_url,
            iconUrl: link.icon_url,
            iconPath: link.icon_path,
            previewUrl: link.preview_url,
            previewPath: link.preview_path,
            isActive: link.is_active,
            sortOrder: link.sort_order,
          }));
      setLinks(withAutomaticOrder(data));
    } catch (error) {
      void reportClientError('Failed to load ROPA links:', error);
      setErrorMessage(getSafeUserErrorMessage(error, 'โหลดเมนู ROPA ไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, [canManage]);

  useEffect(() => {
    if (!canManage && activeTab === 'settings') setActiveTab('links');
  }, [activeTab, canManage]);

  const visibleLinks = useMemo(() => links.filter((link) => link.isActive), [links]);

  const updateLink = (index: number, patch: Partial<RopaLinkDraft>) => {
    setLinks((current) => current.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)));
    setMessage(null);
    setErrorMessage(null);
  };

  const addLink = () => {
    setLinks((current) => withAutomaticOrder([...current, createNewLink((current.length + 1) * 10)]));
    setMessage(null);
  };

  const removeLink = (index: number) => {
    const target = links[index];
    if (target?.id) setDeletedIds((current) => [...current, target.id as string]);
    setLinks((current) => withAutomaticOrder(current.filter((_, linkIndex) => linkIndex !== index)));
    setMessage(null);
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    setLinks((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return withAutomaticOrder(next);
    });
    setMessage(null);
  };

  const handleImageUpload = async (index: number, kind: 'icon' | 'preview', file?: File) => {
    if (!file) return;
    const uploadKey = `${kind}-${index}`;
    setUploadingImage(uploadKey);
    setErrorMessage(null);
    try {
      const uploaded = await uploadRopaLinkImage(file, kind);
      updateLink(index, kind === 'icon'
        ? { iconUrl: uploaded.url, iconPath: uploaded.path }
        : { previewUrl: uploaded.url, previewPath: uploaded.path });
    } catch (error) {
      void reportClientError('Failed to upload ROPA image:', error);
      setErrorMessage(getSafeUserErrorMessage(error, 'อัปโหลดรูปไม่สำเร็จ'));
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveRopaLinkSettings({ links, deletedIds, updatedBy: profile?.user_id ?? null });
      setLinks(saved);
      setDeletedIds([]);
      setMessage('บันทึกการตั้งค่าเมนู ROPA เรียบร้อย');
      setIsSaveModalOpen(false);
    } catch (error) {
      void reportClientError('Failed to save ROPA links:', error);
      setErrorMessage(getSafeUserErrorMessage(error, 'บันทึกเมนู ROPA ไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      void reportClientError('Logout failed:', error);
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 lg:block',
            isSidebarOpen ? 'w-80 px-4 py-5' : 'w-0 px-0 py-5',
          )}
          aria-hidden={!isSidebarOpen}
        >
          {isSidebarOpen ? (
            <>
              <div className="mb-7">
                <button type="button" onClick={() => navigate('/portal')} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-violet-700 transition hover:text-violet-900">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> กลับ Portal
                </button>
                <div className="text-xl font-bold text-violet-700">ROPA</div>
                <div className="mt-1 text-sm leading-5 text-slate-500">บันทึกรายการประมวลผลข้อมูลส่วนบุคคล</div>
              </div>

              <nav className="space-y-1" aria-label="เมนู ROPA">
                <button
                  type="button"
                  onClick={() => setActiveTab('links')}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition',
                    activeTab === 'links' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" /> หน้าหลัก ROPA
                </button>

                {canManage ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition',
                        activeTab === 'settings' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <Settings2 className="h-4 w-4 shrink-0" aria-hidden="true" /> ตั้งค่าเมนูย่อย
                    </button>
                  </div>
                ) : null}
              </nav>
            </>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((current) => !current)}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
                  aria-label={isSidebarOpen ? 'ปิดแถบเมนู' : 'เปิดแถบเมนู'}
                  aria-pressed={isSidebarOpen}
                >
                  {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" aria-hidden="true" /> : <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />}
                </button>
                <div className="min-w-0">
                  <button type="button" onClick={() => navigate('/portal')} className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 transition hover:text-violet-900 lg:hidden">
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> กลับ Portal
                  </button>
                  <div className="text-sm font-semibold text-slate-900">{profile?.full_name || 'SmartDSP User'}</div>
                  <div className="truncate text-xs text-slate-500">
                    {profile?.department || 'ไม่ระบุหน่วยงาน'} · {profile?.role ? roleLabels[profile.role] : 'ไม่ระบุสิทธิ์'}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setIsLogoutModalOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden" aria-label="เมนู ROPA บนมือถือ">
              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
                  activeTab === 'links' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" /> หน้าหลัก ROPA
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
                    activeTab === 'settings' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <Settings2 className="h-4 w-4" aria-hidden="true" /> ตั้งค่าเมนูย่อย
                </button>
              ) : null}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {errorMessage ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

            {activeTab === 'links' ? (
              <section>
                <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-indigo-700 to-sky-700 p-6 text-white shadow-lg shadow-violet-100 sm:p-8">
                  <div className="max-w-3xl">
                    <h2 className="mt-4 text-2xl font-bold">ศูนย์รวมแบบบันทึกและเอกสารคุ้มครองข้อมูลส่วนบุคคล</h2>
                    <p className="mt-2 text-sm leading-6 text-violet-50 sm:text-base">เลือกการ์ดที่ต้องการเพื่อเปิดแบบบันทึก ROPA หรือตัวอย่าง Privacy Notice</p>
                  </div>
                </div>

                {loading ? (
                  <p className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> กำลังโหลดรายการ...
                  </p>
                ) : null}

                {!loading && visibleLinks.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {visibleLinks.map((link) => {
                      const isInternal = link.linkUrl.startsWith('/') && !link.linkUrl.startsWith('//');
                      const cardBody = (
                        <>
                          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-50 to-sky-100">
                            {link.previewUrl ? (
                              <img src={link.previewUrl} alt={`ภาพตัวอย่าง ${link.title}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <div className="rounded-2xl bg-white/80 p-5 text-violet-700 shadow-sm ring-1 ring-violet-100">
                                  <ImagePlus className="h-10 w-10" aria-hidden="true" />
                                </div>
                              </div>
                            )}
                            <span className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white text-violet-700 shadow-md ring-1 ring-slate-100">
                              {link.iconUrl ? <img src={link.iconUrl} alt="" className="h-full w-full object-cover" /> : <Link2 className="h-5 w-5" aria-hidden="true" />}
                            </span>
                          </div>
                          <div className="flex min-h-44 flex-col p-5">
                            <h3 className="text-lg font-bold leading-7 text-slate-950">{link.title}</h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{link.description || 'เปิดดูรายละเอียดและเอกสารที่เกี่ยวข้อง'}</p>
                            <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-violet-700">
                              เปิดดูรายการ <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </div>
                        </>
                      );
                      const cardClass = 'group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100';

                      return isInternal ? (
                        <Link key={link.id || `${link.title}-${link.sortOrder}`} to={link.linkUrl} className={cardClass}>{cardBody}</Link>
                      ) : (
                        <a key={link.id || `${link.title}-${link.sortOrder}`} href={link.linkUrl} target="_blank" rel="noreferrer" className={cardClass}>{cardBody}</a>
                      );
                    })}
                  </div>
                ) : null}

                {!loading && visibleLinks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">ยังไม่มีรายการ ROPA ที่เปิดใช้งาน</p>
                ) : null}
              </section>
            ) : (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-xl font-semibold text-slate-950">ตั้งค่าเมนูย่อย ROPA</h1>
                    <p className="mt-1 text-sm text-slate-500">กำหนดชื่อ รายละเอียด ลิงก์ รูปไอคอน และภาพตัวอย่าง ระบบจัดลำดับให้อัตโนมัติ</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={addLink} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มเมนู
                    </button>
                    <button type="button" onClick={() => setIsSaveModalOpen(true)} disabled={saving || loading || Boolean(uploadingImage)} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                      <Save className="h-4 w-4" aria-hidden="true" /> บันทึกการตั้งค่า
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  {loading ? (
                    <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> กำลังโหลดการตั้งค่า...
                    </p>
                  ) : null}
                  {!loading && links.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">กด “เพิ่มเมนู” เพื่อสร้างรายการแรก</p> : null}
                  {!loading ? links.map((link, index) => (
                    <article key={link.id || `new-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">ลำดับอัตโนมัติ {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => moveLink(index, -1)} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" title="เลื่อนขึ้น">
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => moveLink(index, 1)} disabled={index === links.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" title="เลื่อนลง">
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => updateLink(index, { isActive: !link.isActive })} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${link.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-600'}`}>
                            {link.isActive ? 'กำลังแสดง' : 'ซ่อนอยู่'}
                          </button>
                          <button type="button" onClick={() => removeLink(index)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50" title="ลบรายการ">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-[1fr_220px_320px]">
                        <div className="grid content-start gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium text-slate-700">
                          ชื่อการ์ด
                          <input value={link.title} onChange={(event) => updateLink(index, { title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="ชื่อที่แสดงบนหน้าหลัก" />
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                          ลิงก์ปลายทาง
                          <input type="text" value={link.linkUrl} onChange={(event) => updateLink(index, { linkUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="https://... หรือ /privacy-notice" />
                        </label>
                        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                          รายละเอียด
                          <input value={link.description || ''} onChange={(event) => updateLink(index, { description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="คำอธิบายสั้น ๆ" />
                        </label>
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-medium text-slate-700">รูปไอคอน</div>
                          <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
                            {link.iconUrl ? <img src={link.iconUrl} alt="ตัวอย่างไอคอน" className="h-full w-full object-contain p-3" /> : <ImagePlus className="h-8 w-8 text-slate-300" aria-hidden="true" />}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                              {uploadingImage === `icon-${index}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                              เลือกรูป
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={Boolean(uploadingImage)} onChange={(event) => { void handleImageUpload(index, 'icon', event.target.files?.[0]); event.target.value = ''; }} />
                            </label>
                            {link.iconUrl ? <button type="button" onClick={() => updateLink(index, { iconUrl: null, iconPath: null })} className="rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600">เอารูปออก</button> : null}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-medium text-slate-700">ภาพตัวอย่างบนการ์ด</div>
                          <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
                            {link.previewUrl ? <img src={link.previewUrl} alt="ภาพตัวอย่างการ์ด" className="h-full w-full object-cover" /> : <ImagePlus className="h-9 w-9 text-slate-300" aria-hidden="true" />}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                              {uploadingImage === `preview-${index}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                              เลือกรูป
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={Boolean(uploadingImage)} onChange={(event) => { void handleImageUpload(index, 'preview', event.target.files?.[0]); event.target.value = ''; }} />
                            </label>
                            {link.previewUrl ? <button type="button" onClick={() => updateLink(index, { previewUrl: null, previewPath: null })} className="rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600">เอารูปออก</button> : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  )) : null}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={handleSave}
        title="ยืนยันการบันทึกเมนู ROPA"
        message="ระบบจะบันทึกชื่อ ลิงก์ รูป สถานะ และจัดลำดับรายการให้อัตโนมัติ"
        confirmLabel="บันทึก"
        cancelLabel="ยกเลิก"
        isLoading={saving}
        variant="info"
      />
      <ConfirmModal
        isOpen={Boolean(message)}
        onClose={() => setMessage(null)}
        onConfirm={() => setMessage(null)}
        title="บันทึกสำเร็จ"
        message={message || ''}
        confirmLabel="ตกลง"
        showCancelButton={false}
        variant="success"
      />
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหายได้"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
