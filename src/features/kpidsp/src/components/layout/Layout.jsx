import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, ShieldCheck, ChevronDown, ChevronRight, KeyRound } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../../../../stores/auth.store';
import { ConfirmModal } from '../../../../../components/ui/ConfirmModal';
import kpiSystemLogo from '../../assets/logoCopyDsp.png';

const roleLabels = {
  super_admin: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
  admin: 'ผู้ดูแลระบบ (Admin)',
  executive: 'ผู้บริหาร (Executive)',
  hr: 'เจ้าหน้าที่กลุ่มงานทรัพยากรบุคคล (HR)',
  personnel: 'บุคลากร (Personnel)',
};

export default function Layout() {
  const { signOut } = useAuth();
  const {
    user: smartUser,
    profile: smartProfile,
    permissions: smartPermissions,
    signOut: smartSignOut,
    initialize: initializeAuth,
    initialized: isAuthInitialized,
  } = useAuthStore();
  const navigate = useNavigate();
  const userPanelRef = useRef(null);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // เรียก initializeAuth() เพื่อซิงค์ session บัญชีผู้ใช้จาก LocalStorage ข้ามแท็บทันที
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const accountLabel = smartProfile?.full_name || smartUser?.email || 'เข้าสู่ระบบแล้ว';
  const accountDetail = smartProfile?.work_group || 'เมนูส่วนตัว';
  const roleLabel = smartProfile?.role ? (roleLabels[smartProfile.role] || smartProfile.role) : '-';
  const workGroupLabel = smartProfile?.work_group || smartProfile?.department || '-';
  
  // ตรวจสอบสิทธิ์ Admin จากระบบ SmartDSP (super_admin, admin หรือผู้มีสิทธิ์จัดการตัวชี้วัด)
  const isSmartAuthenticated = !!smartUser;
  const isSmartAdmin = isSmartAuthenticated && (
    ['super_admin', 'admin'].includes(String(smartProfile?.role || '').toLowerCase()) ||
    (Array.isArray(smartPermissions) && smartPermissions.includes('kpidsp.indicators.manage'))
  );

  useEffect(() => {
    if (!isUserPanelOpen) return;

    const handlePointerDown = (event) => {
      if (!userPanelRef.current?.contains(event.target)) {
        setIsUserPanelOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isUserPanelOpen]);

  // เริ่มต้นให้เปิดบนหน้าจอใหญ่ และปิดบนจอมือถือ
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const currentView = new URLSearchParams(location.search).get('view') || 'redesign';
  const isOverviewRedesign = location.pathname === '/' && currentView !== 'classic';

  const sectionTabs = [
    ['goals', 'เป้าหมาย SDGs'],
    ['summary', 'ผลการดำเนินงาน'],
    ['coverage', 'สัดส่วนข้อมูล'],
    ['distribution', 'ความน่าเชื่อถือ'],
    ['province', 'แผนที่จังหวัด'],
    ['insights', 'บทประชาสัมพันธ์'],
    ['timeline', 'เส้นทาง 2573'],
  ];
  const mainTopTabs = [
    { label: 'สรุปผล (รวม)', path: '/kpi' },
    { label: 'ตัวชี้วัด SDGs', path: '/kpi/sdgs' },
    { label: 'Health KPI', path: '/kpi/health' },
  ];
  const adminTopTabs = [
    { label: 'บันทึก SDGs', path: '/kpi/entry/sdgs' },
    { label: 'บันทึก Health', path: '/kpi/entry/health' },
    { label: 'จัดการ SDGs', path: '/kpi/manage/sdgs' },
    { label: 'จัดการ Health', path: '/kpi/manage/health' },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    const mainEl = document.querySelector('main');
    if (!el || !mainEl) return;
    const targetTop = Math.max(0, el.offsetTop - 20);
    mainEl.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  // ปิดเมนูอัติโนมัติบนมือถือเวลากดเปลี่ยนหน้าเพจ
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  // ซิงค์การเปิด/ปิด เมื่อย่อขยายหน้าจอ
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Background glowing blobs */}
      <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-200/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[40%] rounded-full bg-cyan-200/50 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-10%] w-[20%] h-[30%] rounded-full bg-emerald-200/50 blur-[100px] pointer-events-none" />

      {/* Mobile Overlay (ซ่อนไว้) */}

      {/* Sidebar เดิม (ซ่อนไว้ชั่วคราวตามคำสั่ง แต่ไม่ลบโค้ด) */}
      <div className={`
        hidden
        fixed inset-y-0 left-0 z-50 lg:static
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}
        bg-white/95 lg:bg-white/80 border-r border-slate-200 backdrop-blur-xl shadow-[10px_0_30px_rgba(0,0,0,0.05)] lg:shadow-none
      `}>
        {/* ส่ง prop เพื่อให้ Sidebar มีปุ่มวงกลมกากบาท ปิดตัวมันเองได้บนมือถือ */}
        <div className="min-w-[16rem] h-full">
           <Sidebar onClose={() => setIsOpen(false)} isMobile={window.innerWidth < 1024} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative w-full transition-all duration-300">
        
        {/* แถบขอบด้านบนคล้าย Topbar เพื่อใส่ปุ่มแฮมเบอร์เกอร์ */}
        <header className="sticky top-0 h-16 border-b border-slate-700/60 z-50 shrink-0 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(120deg, #031434 0%, #0b2a5a 55%, #134173 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative h-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 px-3 sm:px-4">
          {/* ปุ่มเดิมซ่อนไว้เพื่อคงโครง */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="hidden p-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:border-cyan-300 text-slate-500 hover:text-cyan-700 transition-all shadow-sm group"
            title="พับ/กาง แถบเมนูด้านข้าง (Hamburger Menu)"
          >
            {isOpen && window.innerWidth < 1024 ? (
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <Menu size={20} className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <NavLink to="/kpi" className="truncate shrink-0" title="แดชบอร์ด KPI">
              <img
                src={kpiSystemLogo}
                alt="KPI System"
                className="h-12 w-auto rounded-md"
              />
            </NavLink>
          </div>

          <div className="min-w-0 flex-1 flex items-center justify-start lg:justify-center overflow-x-auto scrollbar-hide overscroll-x-contain py-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-max whitespace-nowrap px-1">
              {mainTopTabs.map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors bg-white/15 text-slate-100 border border-white/15 hover:bg-white/25 active:scale-95"
                >
                  {tab.label}
                </NavLink>
              ))}
              {isSmartAdmin && (
                <div className="mx-1 h-6 w-px bg-white/25" />
              )}
              {isSmartAdmin &&
                adminTopTabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors bg-white/10 text-amber-100 border border-white/15 hover:bg-white/25 active:scale-95"
                  >
                    {tab.label}
                  </NavLink>
                ))}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isSmartAuthenticated ? (
              <div ref={userPanelRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserPanelOpen((current) => !current)}
                  className="inline-flex w-auto max-w-[160px] items-center gap-2 rounded-full border border-white/80 bg-white px-2.5 py-1 text-left text-slate-900 shadow-sm transition hover:bg-cyan-50"
                  aria-expanded={isUserPanelOpen}
                  aria-label={`บัญชีผู้ใช้ ${accountLabel}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold leading-tight text-slate-900">บัญชีผู้ใช้</span>
                    <span className="block truncate text-[10px] font-medium leading-tight text-slate-500">เมนูส่วนตัว</span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${isUserPanelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {isUserPanelOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserPanelOpen(false);
                        navigate(smartProfile?.status === 'pending' ? '/pending-approval' : '/portal');
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3.5 text-left transition hover:bg-slate-100"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">ข้อมูลผู้ใช้งาน</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">จัดการบัญชีและเมนูส่วนตัว</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </button>

                    <div className="grid gap-1 p-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                        <div className="grid gap-1">
                          <p className="truncate text-xs font-semibold text-slate-900">{accountLabel}</p>
                          <p className="truncate text-xs text-slate-600">{roleLabel}</p>
                          <p className="whitespace-normal break-words text-xs text-slate-500 leading-4">{workGroupLabel}</p>
                        </div>
                      </div>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserPanelOpen(false);
                          navigate('/settings?tab=password');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        ตั้งค่ารหัสผ่านใหม่
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserPanelOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" aria-hidden="true" />
                        {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/login', { state: { from: location } })}
                className="px-3 py-1.5 text-xs font-black rounded-lg border border-cyan-300/70 text-cyan-50 bg-cyan-500/25 hover:bg-cyan-500/35 transition-colors flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
          </div>
        </header>

        {/* หน้าจอแดชบอร์ดที่ Render ภายใน Outlet */}
        <main className="flex-1 overflow-y-auto px-4 pb-4 pt-0 md:px-8 md:pb-8 md:pt-0 custom-scrollbar relative">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          try {
            setIsLoggingOut(true);
            await smartSignOut();
            signOut();
            setIsLogoutModalOpen(false);
            navigate('/login', { replace: true });
          } catch (error) {
            setIsLogoutModalOpen(false);
            navigate('/login', { replace: true });
          } finally {
            setIsLoggingOut(false);
          }
        }}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบ ใช่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหายได้"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
        zIndexClassName="z-[9999]"
      />
    </div>
  );
}
