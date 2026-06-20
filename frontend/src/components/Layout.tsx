import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Stethoscope,
  ClipboardList,
  CreditCard,
  Dumbbell,
  UserCog,
  BarChart3,
  ShieldCheck,
  Settings,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import type { Role } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Optional permission key; if set, the item shows only when the user holds it. */
  perm?: string;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'dashboard.view' },
  { to: '/clinics', label: 'Clinics', icon: Building2, roles: ['SUPER_ADMIN'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'patients.view' },
  { to: '/consultations', label: 'Consultations', icon: Stethoscope, roles: ['CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'consultations.view' },
  { to: '/visit-history', label: 'Visit History', icon: ClipboardList, roles: ['CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'visit-history.view' },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'payments.view' },
  { to: '/machines', label: 'Machines', icon: Dumbbell, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'], perm: 'machines.view' },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN'], perm: 'users.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['CLINIC_ADMIN'], perm: 'reports.view' },
  { to: '/permissions', label: 'Roles & Permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHYSIOTHERAPIST'] },
];

export default function Layout() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const items = NAV.filter(
    (n) =>
      user &&
      n.roles.includes(user.role) &&
      (!n.perm || can(n.perm)),
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
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm ring-1 ring-inset ring-white/10'
                    : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'drop-shadow' : ''
                    }`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
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
            <div className="text-sm text-muted-foreground">
              {user?.clinic?.name ?? (user?.role === 'SUPER_ADMIN' ? 'System Administration' : '')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user?.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
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
