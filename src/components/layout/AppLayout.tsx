import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  UserCog,
  UserCircle,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';
import { canAccess, roleLabels } from '../../types/roles';
import { cn } from '../../utils/cn';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useState } from 'react';
import { reportClientError } from '../../utils/errorHandling';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'executive', 'hr'],
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'executive', 'hr'],
  },

  {
    to: '/courses',
    label: 'Course Directory',
    icon: BookOpen,
    roles: ['super_admin', 'admin', 'executive', 'hr'],
  },
  {
    to: '/records',
    label: 'Training Records',
    icon: ClipboardList,
    roles: ['super_admin', 'admin', 'hr'],
  },
  {
    to: '/personnel',
    label: 'Personnel',
    icon: Users,
    roles: ['super_admin', 'admin', 'executive', 'hr'],
  },
  {
    to: '/profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
  },
  {
    to: '/self-service',
    label: 'Self-Service',
    icon: FileText,
    roles: ['super_admin', 'admin', 'hr', 'personnel'],
  },
  {
    to: '/settings',
    label: 'ตั้งค่าข้อมูล',
    icon: UserCog,
    roles: ['super_admin', 'admin', 'executive', 'hr', 'personnel'],
  },
  {
    to: '/site-manager',
    label: 'จัดการหน้าเว็บไซต์',
    icon: Megaphone,
    roles: ['super_admin', 'admin'],
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: Activity,
    roles: ['super_admin', 'admin'],
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: Users,
    roles: ['super_admin', 'admin', 'hr'],
  },
  {
    to: '/admin/security',
    label: 'Security',
    icon: Shield,
    roles: ['super_admin'],
  },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { profile, signOut } = useAuthStore();
  const role = profile?.role;
  const visibleItems = navItems.filter((item) => canAccess(role, item.roles));

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
            'hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white py-5 transition-[width,padding] duration-200 lg:block',
            isSidebarCollapsed ? 'w-16 px-2' : 'w-72 px-4',
          )}
        >
          <div className={cn('mb-8', isSidebarCollapsed && 'flex flex-col items-center gap-2')}>
            <div className={cn('flex items-center', isSidebarCollapsed ? 'flex-col gap-2' : 'mb-5 justify-between gap-3')}>
              <button
                type="button"
                onClick={() => navigate('/portal')}
                className={cn(
                  'inline-flex h-9 items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50',
                  isSidebarCollapsed ? 'w-9' : 'px-3',
                )}
                title="กลับ Portal"
                aria-label="กลับ Portal"
              >
                {isSidebarCollapsed ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : 'กลับ Portal'}
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
                aria-label={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
                aria-pressed={isSidebarCollapsed}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <div className={cn(isSidebarCollapsed && 'sr-only')}>
              <div className="text-xl font-bold text-brand-700">PTDMS</div>
              <div className="mt-1 text-sm text-slate-500">{'Training & Development'}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 items-center rounded-md text-sm font-medium transition',
                      isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className={cn(isSidebarCollapsed && 'sr-only')}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition hover:text-brand-900 lg:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  กลับ Portal
                </button>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{profile?.full_name || 'PTDMS User'}</div>
                  <div className="truncate text-xs text-slate-500">
                    {profile?.department || 'No department'} · {role ? roleLabels[role] : 'No role'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 hidden rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg sm:flex">
        <LockKeyhole className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        RBAC active
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        title="ยืนยันการออกจากระบบ"
        message="คุณต้องการออกจากระบบ PTDMS ใช่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกอาจสูญหายได้"
        confirmLabel="ออกจากระบบ"
        cancelLabel="ยกเลิก"
        isLoading={isLoggingOut}
        variant="warning"
      />
    </div>
  );
}
