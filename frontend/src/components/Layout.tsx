import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Stethoscope,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Wrench,
  UserCog,
  BarChart3,
  ShieldCheck,
  Settings,
  HeartPulse,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Wallet,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useClinicScope } from '../auth/ClinicScopeContext';
import { api } from '../lib/api';
import { ThemeToggle } from './ThemeToggle';
import type { Role, Clinic, Paginated } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Optional permission key; if set, the item shows only when the user holds it. */
  perm?: string;
  /** Clinic-scoped page: shown to a super admin only once a clinic is selected. */
  requiresClinic?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'dashboard.view', requiresClinic: true },
  { to: '/clinics', label: 'Clinics', icon: Building2, roles: ['SUPER_ADMIN'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'patients.view', requiresClinic: true },
  { to: '/consultations', label: 'Consultations', icon: Stethoscope, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'consultations.view', requiresClinic: true },
  { to: '/visit-history', label: 'Visit History', icon: ClipboardList, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'visit-history.view', requiresClinic: true },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'payments.view', requiresClinic: true },
  { to: '/machines', label: 'Machines', icon: Dumbbell, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'machines.view' },
  { to: '/machine-complaints', label: 'Machine Complaints', icon: Wrench, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN'], perm: 'machine-complaints.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN'], perm: 'reports.view', requiresClinic: true },
  { to: '/permissions', label: 'Roles & Permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST', 'HR'] },
];

// HR module — Super Admin & the dedicated HR role own the whole thing
// (staff accounts + operational records). Clinic Admins have no HR access.
const HR_ROLES: Role[] = ['SUPER_ADMIN', 'HR'];
const HR_NAV: NavItem[] = [
  { to: '/hr/staff', label: 'Staff', icon: Users, roles: HR_ROLES, perm: 'hr.staff.view' },
  { to: '/hr/employees', label: 'Employment', icon: UserCog, roles: HR_ROLES, perm: 'hr.employees.view' },
  { to: '/hr/attendance', label: 'Attendance', icon: CalendarCheck, roles: HR_ROLES, perm: 'hr.attendance.view' },
  { to: '/hr/leave', label: 'Leave', icon: CalendarDays, roles: HR_ROLES, perm: 'hr.leave.view' },
  { to: '/hr/payroll', label: 'Payroll', icon: Wallet, roles: HR_ROLES, perm: 'hr.payroll.view' },
  { to: '/hr/reports', label: 'Reports', icon: BarChart3, roles: HR_ROLES, perm: 'hr.reports.view' },
];

export default function Layout() {
  const { user, logout, can } = useAuth();
  const { activeClinicId, setActiveClinicId } = useClinicScope();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(() =>
    location.pathname.startsWith('/hr'),
  );

  // Clinic list for the super-admin global selector.
  const clinicsQuery = useQuery({
    queryKey: ['clinics-selector'],
    enabled: isSuper,
    queryFn: async () =>
      (await api.get<Paginated<Clinic>>('/clinics', { params: { limit: 100 } }))
        .data,
  });

  const visible = (n: NavItem) => {
    if (!user) return false;
    if (!n.roles.includes(user.role)) return false;
    if (n.perm && !can(n.perm)) return false;
    // A super admin's clinic-scoped pages appear only once a clinic is chosen.
    if (n.requiresClinic && isSuper && !activeClinicId) return false;
    return true;
  };
  const items = NAV.filter(visible);
  const hrItems = HR_NAV.filter(visible);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/15 text-white shadow-sm ring-1 ring-inset ring-white/10'
        : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
    }`;

  const renderIcon = (Icon: LucideIcon, isActive: boolean) => (
    <Icon
      className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
        isActive ? 'drop-shadow' : ''
      }`}
      strokeWidth={isActive ? 2.4 : 2}
    />
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900 text-brand-50 shadow-glow transition-transform dark:from-[#221a45] dark:via-[#181230] dark:to-[#0e0a20] dark:text-slate-200 dark:border-r dark:border-white/5 dark:shadow-none lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-500 text-white shadow-sm">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">PhysioCare</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              {({ isActive }) => (
                <>
                  {renderIcon(item.icon, isActive)}
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* HR module group */}
          {hrItems.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setHrOpen((v) => !v)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-brand-100/80 transition-all hover:bg-white/10 hover:text-white"
              >
                <Briefcase className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                HR
                <ChevronDown
                  className={`ml-auto h-4 w-4 transition-transform ${
                    hrOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {hrOpen && (
                <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
                  {hrItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={linkClass}
                    >
                      {({ isActive }) => (
                        <>
                          {renderIcon(item.icon, isActive)}
                          {item.label}
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground lg:hidden"
              onClick={() => setOpen(true)}
            >
              ☰
            </button>
            {isSuper ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Clinic:</span>
                <select
                  className="input h-9 max-w-[220px] py-1"
                  value={activeClinicId}
                  onChange={(e) => setActiveClinicId(e.target.value)}
                >
                  <option value="">All clinics (global)</option>
                  {clinicsQuery.data?.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-sm text-muted-foreground">
                {user?.clinic?.name ?? ''}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user?.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white shadow-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <button onClick={logout} className="btn-secondary px-3 py-1.5">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
