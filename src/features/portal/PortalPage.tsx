import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, BookOpenText, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Coins, Database, ExternalLink, FileText, GraduationCap, Headphones, KeyRound, LogOut, Megaphone, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { usePublishedSiteContent } from '../site-content/hooks/useSiteContent';
import { useAuthStore } from '../../stores/auth.store';
import type { PortalUserManual } from '../../types/database.types';
import type { UserRole } from '../../types/roles';
import { canAccess, roleLabels } from '../../types/roles';
import { reportClientError } from '../../utils/errorHandling';
import { listActivePortalUserManuals } from './portalManuals.service';
import { getPortalSurveyState, SYSTEM_SURVEY_CONFIGS } from '../surveys/satisfactionSurvey.service';

const PORTAL_MANUALS_PER_PAGE = 2;

type PortalCard = {
  title: string;
  shortTitle: string;
  description: string;
  to?: string;
  externalUrl?: string;
  icon: typeof GraduationCap;
  roles: UserRole[];
  accent: string;
  meta: string;
};

const coreSystems: PortalCard[] = [
  {
    title: 'Personnel Training & Development Management System',
    shortTitle: 'ระบบบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากรภายใน',
    description: 'กองยุทธศาสตร์และแผนงาน',
    to: '/dashboard',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-brand-600 to-cyan-500',
    meta: 'Training Intelligence',
  },
  {
    title: 'ปฏิทินสำคัญและจองห้องประชุม',
    shortTitle: 'กิจกรรมสำคัญและจองห้องประชุม',
    description: 'ระบบบันทึกกิจกรรมสำคัญและการจองห้องประชุม',
    to: '/strategy-calendar',
    icon: CalendarDays,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-emerald-600 to-amber-500',
    meta: 'Internal Activities',
  },
  {
    title: 'Budget Utilization Dashboard',
    shortTitle: 'ติดตามการใช้จ่ายงบประมาณ',
    description: 'กองยุทธศาสตร์และแผนงาน',
    to: '/budget-utilization',
    icon: Coins,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-teal-700 to-amber-500',
    meta: 'Budget Intelligence',
  },
];

const assetSystems: PortalCard[] = [
  {
    title: 'IT Asset Dashboard',
    shortTitle: 'IT Assets',
    description: 'ระบบติดตามครุภัณฑ์คอมพิวเตอร์ สเปกเครื่อง สถานะคุณภาพ และข้อมูลผู้ใช้งาน',
    to: '/it-assets',
    icon: Monitor,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-blue-700 to-teal-500',
    meta: 'IT Assets',
  },
];

const serviceSystems: PortalCard[] = [
  {
    title: 'DSP Service Management System',
    shortTitle: 'ระบบแจ้งขอรับบริการและงานสนับสนุนด้านสารสนเทศ',
    description: 'ภายในกองยุทธศาสตร์และแผนงาน',
    to: '/spd-service',
    icon: Headphones,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-teal-700 to-sky-500',
    meta: 'Service Desk',
  },
];

const externalSystems: PortalCard[] = [
  {
    title: 'ระบบสารบรรณอิเล็กทรอนิกส์ e-Office',
    shortTitle: 'e-Office',
    description: 'ระบบสารบรรณอิเล็กทรอนิกส์ของกรมควบคุมโรคผ่านลิงก์ภายนอก',
    externalUrl: 'https://ddc.eoffice.go.th/api/auth/login',
    icon: FileText,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-indigo-700 to-sky-500',
    meta: 'External System',
  },
  {
    title: 'ระบบจัดเก็บข้อมูลกลาง กยผ.',
    shortTitle: 'คลังข้อมูลกลาง กยผ.',
    description: 'คลังข้อมูลกลาง กยผ.เวลาสำหรับเข้าใช้งาน 08.30 - 16.30 น.(NAS)',
    externalUrl: 'http://10.100.43.2:5000/#/signin',
    icon: Database,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-slate-700 to-emerald-500',
    meta: 'External System',
  },
  {
    title: 'บันทึกรายการประมวลผลข้อมูลส่วนบุคคลสำหรับผู้ควบคุมข้อมูลส่วนบุคคล (Record of Processing Activities for Data Controller Form)',
    shortTitle: 'บันทึกรายการประมวลผลข้อมูลส่วนบุคคล (ROPA)',
    description: 'แบบบันทึกรายการประมวลผลข้อมูลส่วนบุคคลสำหรับผู้ควบคุมข้อมูลส่วนบุคคล',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1bUQ6hboYaAQacqQANjtzSegFUT4wAFoO5iuqFEJnbig/edit?usp=sharing',
    icon: ClipboardCheck,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-violet-700 to-fuchsia-500',
    meta: 'ROPA Form',
  },
];

const adminSystems: PortalCard[] = [
  {
    title: 'คลังข้อมูลด้านยุทธศาสตร์ กองยุทธศาสตร์และแผนงาน',
    shortTitle: 'คลังข้อมูลด้านยุทธศาสตร์',
    description: 'เข้าถึงแผน ผลการดำเนินงาน และงานวิจัยที่เผยแพร่ในคลังข้อมูลด้านยุทธศาสตร์',
    to: '/strategic-repository',
    icon: BookOpenText,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
    accent: 'from-blue-700 to-teal-500',
    meta: 'Strategic Repository',
  },
  {
    title: 'PTDMS Site Manager',
    shortTitle: 'ตั้งค่า',
    description: 'จัดการหน้า Home ป้ายประชาสัมพันธ์ ข่าวสาร และหมวดเอกสารสำหรับเว็บไซต์',
    to: '/site-manager',
    icon: Megaphone,
    roles: ['super_admin', 'admin'],
    accent: 'from-cyan-700 to-emerald-500',
    meta: 'Public Content',
  },
];

export function PortalPage() {
  const navigate = useNavigate();
  const userPanelRef = useRef<HTMLDivElement | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [manuals, setManuals] = useState<PortalUserManual[]>([]);
  const [manualPage, setManualPage] = useState(0);
  const [surveyStates, setSurveyStates] = useState<Array<{
    config: (typeof SYSTEM_SURVEY_CONFIGS)[number];
    state: NonNullable<Awaited<ReturnType<typeof getPortalSurveyState>>>;
  }>>([]);
  const { user, profile, assuranceLevel, signOut } = useAuthStore();
  const mfaSetupRequired = profile?.mfa_required === true && assuranceLevel !== 'aal2';
  const siteContent = usePublishedSiteContent();
  const portalBackgroundImage = siteContent.portalPage.backgroundImageUrl || '/SmartDSP.png';
  const portalBackgroundImageEnabled = siteContent.portalPage.status === 'published' && siteContent.portalPage.backgroundImageEnabled !== false;
  const portalBackgroundOverlayValue = Math.min(90, Math.max(0, siteContent.portalPage.backgroundOverlayOpacity));
  const portalBackgroundOverlayOpacity = portalBackgroundOverlayValue / 100;
  const portalBackgroundBrightness = 1 + ((90 - portalBackgroundOverlayValue) / 90) * 0.2;
  const portalHeaderBackgroundImage = siteContent.portalPage.headerBackgroundImageUrl || '';
  const portalHeaderBackgroundImageEnabled =
    siteContent.portalPage.status === 'published' && siteContent.portalPage.headerBackgroundImageEnabled !== false && Boolean(portalHeaderBackgroundImage);
  const portalHeaderOverlayColor = siteContent.portalPage.headerOverlayColor || '#ffffff';
  const portalHeaderOverlayOpacity = Math.min(100, Math.max(0, siteContent.portalPage.headerOverlayOpacity)) / 100;
  useAuditPageAccess({ module: 'ptdms', action: 'ptdms_portal_access', route: '/portal' });
  useEffect(() => {
    let active = true;

    async function loadManuals() {
      try {
        const data = await listActivePortalUserManuals();
        if (active) {
          setManuals(data);
        }
      } catch (error) {
        void reportClientError('Failed to load portal user manuals:', error);
      }
    }

    void loadManuals();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) return undefined;

    Promise.all(SYSTEM_SURVEY_CONFIGS.map(async (config) => ({
      config,
      state: await getPortalSurveyState(user.id, config.code),
    })))
      .then((results) => {
        if (!active) return;
        setSurveyStates(results.filter((result): result is typeof result & { state: NonNullable<typeof result.state> } => result.state !== null));
      })
      .catch((error) => {
        void reportClientError('Failed to load portal survey state:', error);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const totalManualPages = Math.max(1, Math.ceil(manuals.length / PORTAL_MANUALS_PER_PAGE));
  const visibleManuals = useMemo(
    () => manuals.slice(manualPage * PORTAL_MANUALS_PER_PAGE, manualPage * PORTAL_MANUALS_PER_PAGE + PORTAL_MANUALS_PER_PAGE),
    [manualPage, manuals],
  );

  useEffect(() => {
    setManualPage((currentPage) => Math.min(currentPage, totalManualPages - 1));
  }, [totalManualPages]);

  useEffect(() => {
    if (!isUserPanelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && userPanelRef.current?.contains(target)) {
        return;
      }

      setIsUserPanelOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isUserPanelOpen]);
  const visibleSystems = mfaSetupRequired
    ? []
    : [...coreSystems, ...assetSystems, ...serviceSystems, ...externalSystems, ...adminSystems]
      .filter((system) => canAccess(profile?.role, system.roles));
  const getSystemPath = (system: PortalCard) => {
    if (!system.to) {
      return '/portal';
    }

    if (system.to === '/dashboard' && profile?.role === 'personnel') {
      return '/profile';
    }

    if (system.to === '/spd-service' && profile?.role !== 'super_admin' && profile?.role !== 'admin' && profile?.role !== 'executive') {
      return '/spd-service/my-requests';
    }

    return system.to;
  };


  const handleOpenPasswordSettings = () => {
    setIsUserPanelOpen(false);
    navigate('/settings?tab=password');
  };

  const handleRequestSignOut = () => {
    setIsUserPanelOpen(false);
    setIsLogoutModalOpen(true);
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {portalBackgroundImageEnabled ? (
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${portalBackgroundImage})`,
            filter: `brightness(${portalBackgroundBrightness})`,
          }}
          aria-hidden="true"
        />
      ) : null}
      {portalBackgroundImageEnabled ? (
        <div
          className="fixed inset-0 bg-slate-950"
          style={{ opacity: portalBackgroundOverlayOpacity }}
          aria-hidden="true"
        />
      ) : null}
      <header
        className="relative z-50 border-b border-slate-200 bg-white/95 bg-cover bg-center backdrop-blur"
        style={{ backgroundImage: portalHeaderBackgroundImageEnabled ? `url(${portalHeaderBackgroundImage})` : undefined }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: portalHeaderOverlayColor, opacity: portalHeaderOverlayOpacity }} aria-hidden="true" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <img src="/logoDSP.png" alt="กรมควบคุมโรค" className="h-14 w-auto object-contain" />
          </div>
          <div ref={userPanelRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserPanelOpen((current) => !current)}
              className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-brand-200 hover:bg-slate-50"
              aria-expanded={isUserPanelOpen}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-semibold">บัญชีผู้ใช้</span>
                <span className="block text-xs font-medium text-slate-500">เมนูส่วนตัว</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isUserPanelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {isUserPanelOpen ? (
              <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">ข้อมูลผู้ใช้งาน</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">จัดการบัญชีและเมนูส่วนตัว</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </div>

                <div className="grid gap-1 p-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                    <div className="grid gap-2">
                      <div className="grid gap-0.5">
                        <p className="truncate text-sm font-semibold text-slate-900">{profile?.full_name || '-'}</p>
                      </div>
                      <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {profile?.role ? roleLabels[profile.role] : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="whitespace-normal break-words text-sm font-semibold leading-5 text-slate-900">{profile?.work_group || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleOpenPasswordSettings}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    ตั้งค่ารหัสผ่านใหม่
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {mfaSetupRequired ? (
          <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm" role="alert">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="font-bold text-amber-950">บัญชีนี้ถูกกำหนดให้เปิดใช้งาน MFA</h1>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    กรุณาลงทะเบียนและยืนยัน Google Authenticator ก่อนเข้าใช้งานระบบอื่น
                  </p>
                </div>
              </div>
              <Link
                to={'/settings?tab=security&mfa=required'}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                ตั้งค่า MFA ตอนนี้
              </Link>
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-emerald-500 to-amber-400" />
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="min-w-0">
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                เลือกระบบที่ต้องการใช้งาน
              </h1>
              {manuals.length > 0 || surveyStates.length > 0 ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {surveyStates.length > 0 ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/30 p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 ring-1 ring-emerald-200">
                          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-950">แบบสำรวจความพึงพอใจ</h2>
                          <p className="text-xs text-slate-500">เลือกประเมินระบบที่ท่านใช้งาน</p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {surveyStates.map(({ config, state }, index) => (
                          <Link
                            key={config.code}
                            to={config.code === 'smartdsp-satisfaction' ? '/satisfaction-survey' : `/satisfaction-survey/${config.code}`}
                            className={`group flex min-h-24 flex-col justify-between rounded-md border border-slate-200 bg-white p-3 transition hover:border-emerald-400 hover:bg-emerald-50 ${surveyStates.length % 2 === 1 && index === surveyStates.length - 1 ? 'sm:col-span-2' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold leading-5 text-slate-900">{config.shortTitle}</span>
                              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${state.ownResponse ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {state.ownResponse ? 'ตอบแล้ว' : 'เปิดรับ'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-end justify-between gap-2 text-xs text-slate-500">
                              <span className="line-clamp-2">{state.ownResponse ? 'ดูคำตอบของฉัน' : state.survey.title}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700 transition group-hover:translate-x-1" aria-hidden="true" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : <div className="hidden lg:block" />}
                  {manuals.length > 0 ? <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 ring-1 ring-slate-200">
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-m font-semibold text-slate-1000">คู่มือการใช้งาน</p>
                          <p className="text-xs text-slate-500">เอกสารสำหรับผู้ใช้งานระบบ</p>
                        </div>
                      </div>
                      {totalManualPages > 1 ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setManualPage((currentPage) => Math.max(0, currentPage - 1))}
                            disabled={manualPage === 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="หน้าก่อนหน้า"
                          >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="min-w-12 text-center text-xs font-semibold text-slate-500">
                            {manualPage + 1}/{totalManualPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setManualPage((currentPage) => Math.min(totalManualPages - 1, currentPage + 1))}
                            disabled={manualPage >= totalManualPages - 1}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="หน้าถัดไป"
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2">
                      {visibleManuals.map((manual) => (
                        <a
                          key={manual.id}
                          href={manual.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="grid gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50/40 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900">{manual.title}</span>
                            {manual.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{manual.description}</span> : null}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                            เปิด PDF
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {visibleSystems.map((system) => {
            const Icon = system.icon;
            const isExternal = Boolean(system.externalUrl);
            const cardClassName = "group flex min-h-28 flex-col items-center rounded-md p-2 text-center transition hover:bg-slate-100 sm:min-h-0 sm:items-stretch sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:text-left sm:shadow-sm sm:hover:-translate-y-0.5 sm:hover:border-slate-300 sm:hover:shadow-lg";
            const cardContent = (
              <div className="flex h-full flex-col items-center gap-2 sm:min-h-48 sm:items-stretch sm:justify-between sm:gap-6">
                <div className="w-full">
                  <div className="flex justify-center sm:items-start sm:justify-between sm:gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${system.accent} text-white shadow-sm ring-1 ring-black/5 sm:h-20 sm:w-20`}
                    >
                      <Icon className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />
                    </div>
                    <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                      {isExternal ? <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                      {system.meta}
                    </span>
                  </div>
                  <h2 className="mt-2 text-center text-xs font-semibold leading-snug tracking-normal text-slate-950 min-[380px]:text-sm sm:mt-5 sm:text-left sm:text-xl">
                    {system.shortTitle}
                  </h2>
                  <p className="mt-1 hidden text-sm leading-6 text-slate-600 sm:block">{system.description}</p>
                </div>

                <div className="hidden items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-brand-700 sm:flex">
                  <span>{isExternal ? 'เปิดระบบภายนอก' : 'เข้าใช้งาน'}</span>
                  {isExternal ? <ExternalLink className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />}
                </div>
              </div>
            );

            return isExternal ? (
              <a
                key={system.externalUrl}
                href={system.externalUrl}
                target="_blank"
                rel="noreferrer"
                className={cardClassName}
              >
                {cardContent}
              </a>
            ) : (
              <Link
                key={system.to}
                to={getSystemPath(system)}
                className={cardClassName}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </main>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่?"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
