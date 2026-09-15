import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuthStore } from '../../../stores/auth.store';
import { useSiteContentDraft } from '../../site-content/hooks/useSiteContent';
import { SiteManagerBannerPreview } from '../components/SiteManagerBannerPreview';
import { SiteManagerBrandingEditor } from '../components/SiteManagerBrandingEditor';
import { SiteManagerContentEditor } from '../components/SiteManagerContentEditor';
import { SiteManagerLoginPageEditor } from '../components/SiteManagerLoginPageEditor';
import { SiteManagerPortalPageEditor } from '../components/SiteManagerPortalPageEditor';
import { SiteManagerPlanDocumentsEditor } from '../components/SiteManagerPlanDocumentsEditor';
import { SiteManagerPlanPreview } from '../components/SiteManagerPlanPreview';
import { SiteManagerPortalManualsEditor } from '../components/SiteManagerPortalManualsEditor';
import { SiteManagerSatisfactionSurveyEditor } from '../components/SiteManagerSatisfactionSurveyEditor';
import { SiteManagerSystemSatisfactionSurveysEditor } from '../components/SiteManagerSystemSatisfactionSurveysEditor';

type PlanFocusTarget = {
  index: number;
  requestId: number;
};

type SiteManagerTab =
  | 'branding'
  | 'home-content'
  | 'plan-documents'
  | 'disease-control-plan'
  | 'annual-guidelines'
  | 'risk-management'
  | 'executive-policy'
  | 'r2r-research'
  | 'portal-manuals'
  | 'login-page'
  | 'portal-page'
  | 'satisfaction-survey'
  | 'system-satisfaction-surveys';

const siteManagerTabs: Array<{ id: SiteManagerTab; label: string; hidden?: boolean }> = [
  { id: 'branding', label: 'โลโก้/แบรนด์' },
  { id: 'home-content', label: 'ป้าย/ข่าวประชาสัมพันธ์', hidden: true },
  { id: 'plan-documents', label: 'แผนระดับต่าง ๆ', hidden: true },
  { id: 'disease-control-plan', label: 'แผนงานควบคุมโรค', hidden: true },
  { id: 'annual-guidelines', label: 'แนวทางประจำปี', hidden: true },
  { id: 'risk-management', label: 'แผนบริหารความเสี่ยง', hidden: true },
  { id: 'executive-policy', label: 'นโยบายผู้บริหาร', hidden: true },
  { id: 'r2r-research', label: 'งานวิจัยจากงานประจำ R2R', hidden: true },
  { id: 'portal-manuals', label: 'ตั้งค่าคู่มือการใช้งาน' },
  { id: 'login-page', label: 'จัดการภาพหน้า login' },
  { id: 'portal-page', label: 'จัดการภาพหน้า Portal' },
  { id: 'satisfaction-survey', label: 'แบบสำรวจความพึงพอใจ' },
  { id: 'system-satisfaction-surveys', label: 'แบบสำรวจความพึงพอใจแยกตามระบบ' },
];

export function SiteManagerPage() {
  const { contentDraft, setContentDraft, loadingSource, saveDraft, resetDraft } = useSiteContentDraft();
  const profile = useAuthStore((state) => state.profile);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteManagerTab>('branding');
  const [planFocusTarget, setPlanFocusTarget] = useState<PlanFocusTarget | null>(null);
  const canManageSecurity = profile?.role === 'super_admin';
  const visibleTabs = siteManagerTabs.filter((tab) => !tab.hidden);
  const activePlanPreview =
    activeTab === 'plan-documents'
      ? { title: 'แผนระดับต่าง ๆ', cards: contentDraft.planLevelCards }
      : activeTab === 'disease-control-plan'
        ? { title: 'แผนงานควบคุมโรค', cards: contentDraft.diseaseControlPlanCards }
        : activeTab === 'annual-guidelines'
          ? { title: 'แนวทางประจำปี', cards: contentDraft.annualGuidelineCards }
          : activeTab === 'risk-management'
            ? { title: 'แผนบริหารความเสี่ยง', cards: contentDraft.riskManagementPlanCards }
            : activeTab === 'executive-policy'
              ? { title: 'นโยบายผู้บริหาร', cards: contentDraft.executivePolicyCards }
              : activeTab === 'r2r-research'
                ? { title: 'งานวิจัยจากงานประจำ R2R', cards: contentDraft.r2rResearchCards }
                : null;

  const handleTabChange = (tabId: SiteManagerTab) => {
    setActiveTab(tabId);
    setPlanFocusTarget(null);
  };

  const handlePlanPreviewSelect = (index: number) => {
    setPlanFocusTarget((currentTarget) => ({ index, requestId: (currentTarget?.requestId ?? 0) + 1 }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    const saveTarget = await saveDraft();
    setIsSaving(false);
    setDraftMessage(
      saveTarget === 'supabase'
        ? 'บันทึกข้อมูลเรียบร้อย'
        : 'บันทึกแบบ fallback ลงเครื่องนี้เรียบร้อย ยังไม่สามารถบันทึก Supabase ได้',
    );
  };

  const handleResetDraft = () => {
    resetDraft();
    setDraftMessage('คืนค่าเริ่มต้นเรียบร้อย');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการหน้าเว็บไซต์"
        description="สำหรับ Admin จัดการ Home banner ข่าวประชาสัมพันธ์ ปุ่มนำทาง และหมวดเอกสารของหน้า public"
      />

      {draftMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {draftMessage}
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`min-w-max rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'home-content' ? <SiteManagerBannerPreview banner={contentDraft.heroBanner} /> : null}
        {activePlanPreview ? (
          <SiteManagerPlanPreview title={activePlanPreview.title} cards={activePlanPreview.cards} onCardSelect={handlePlanPreviewSelect} />
        ) : null}

        {activeTab === 'branding' ? (
          <SiteManagerBrandingEditor
            brandSettings={contentDraft.brandSettings}
            onBrandSettingsChange={(nextBrandSettings) => {
              setContentDraft((currentContent) => ({ ...currentContent, brandSettings: nextBrandSettings }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
          />
        ) : activeTab === 'home-content' ? (
          <SiteManagerContentEditor
            banner={contentDraft.heroBanner}
            newsDrafts={contentDraft.newsItems}
            faqDrafts={contentDraft.faqItems}
            onBannerChange={(nextBanner) => {
              setContentDraft((currentContent) => ({ ...currentContent, heroBanner: nextBanner }));
              setDraftMessage(null);
            }}
            onNewsChange={(nextNewsDrafts) => {
              setContentDraft((currentContent) => ({ ...currentContent, newsItems: nextNewsDrafts }));
              setDraftMessage(null);
            }}
            onFaqChange={(nextFaqDrafts) => {
              setContentDraft((currentContent) => ({ ...currentContent, faqItems: nextFaqDrafts }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
          />
        ) : activeTab === 'plan-documents' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนระดับต่าง ๆ"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.planLevelCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, planLevelCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'disease-control-plan' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.diseaseControlPlanCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, diseaseControlPlanCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'annual-guidelines' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแนวทางดำเนินงานประจำปี"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.annualGuidelineCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, annualGuidelineCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'risk-management' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนบริหารความเสี่ยงยุทธศาสตร์"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.riskManagementPlanCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, riskManagementPlanCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'executive-policy' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการนโยบายผู้บริหาร"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF/URL รายละเอียด และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.executivePolicyCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, executivePolicyCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'r2r-research' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการงานวิจัยจากงานประจำ R2R"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF/URL รายละเอียด และภาพหน้าปกสำหรับผลงาน R2R"
            planCards={contentDraft.r2rResearchCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, r2rResearchCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
            focusTarget={planFocusTarget}
          />
        ) : activeTab === 'portal-manuals' ? (
          <SiteManagerPortalManualsEditor />
        ) : activeTab === 'login-page' ? (
          <SiteManagerLoginPageEditor
            loginPage={contentDraft.loginPage}
            onLoginPageChange={(nextLoginPage) => {
              setContentDraft((currentContent) => ({ ...currentContent, loginPage: nextLoginPage }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
          />
        ) : activeTab === 'portal-page' ? (
          <SiteManagerPortalPageEditor
            portalPage={contentDraft.portalPage}
            onPortalPageChange={(nextPortalPage) => {
              setContentDraft((currentContent) => ({ ...currentContent, portalPage: nextPortalPage }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
          />
        ) : activeTab === 'satisfaction-survey' ? (
          <SiteManagerSatisfactionSurveyEditor />
        ) : activeTab === 'system-satisfaction-surveys' ? (
          <SiteManagerSystemSatisfactionSurveysEditor />
        ) : (
          <SiteManagerBrandingEditor
            brandSettings={contentDraft.brandSettings}
            onBrandSettingsChange={(nextBrandSettings) => {
              setContentDraft((currentContent) => ({ ...currentContent, brandSettings: nextBrandSettings }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
            canResetDraft={canManageSecurity}
          />
        )}

        {loadingSource ? (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            แหล่งข้อมูลปัจจุบัน: {loadingSource === 'supabase' ? 'Supabase' : 'localStorage fallback'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
