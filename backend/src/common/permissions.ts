import { Role } from './enums';

/**
 * Master catalog of fine-grained permissions, grouped by module.
 * Adding a permission here makes it appear in the Roles & Permissions matrix.
 */
export const PERMISSION_CATALOG: {
  group: string;
  permissions: { key: string; label: string }[];
}[] = [
  {
    group: 'Dashboard',
    permissions: [{ key: 'dashboard.view', label: 'View dashboard' }],
  },
  {
    group: 'Patients',
    permissions: [
      { key: 'patients.view', label: 'View patients' },
      { key: 'patients.create', label: 'Register patients' },
      { key: 'patients.edit', label: 'Edit patients' },
      { key: 'patients.delete', label: 'Delete patients' },
    ],
  },
  {
    group: 'Consultations',
    permissions: [
      { key: 'consultations.view', label: 'View consultations' },
      { key: 'consultations.create', label: 'Create consultations' },
      { key: 'consultations.edit', label: 'Edit consultations' },
    ],
  },
  {
    group: 'Visit History',
    permissions: [{ key: 'visit-history.view', label: 'View visit history' }],
  },
  {
    group: 'Payments',
    permissions: [
      { key: 'payments.view', label: 'View payments' },
      { key: 'payments.update', label: 'Update payments' },
    ],
  },
  {
    group: 'Machines',
    permissions: [
      { key: 'machines.view', label: 'View machines' },
      { key: 'machines.manage', label: 'Manage machines' },
    ],
  },
  {
    group: 'Machine Complaints',
    permissions: [
      { key: 'machine-complaints.view', label: 'View machine complaints' },
      {
        key: 'machine-complaints.manage',
        label: 'Report / inspect / resolve complaints',
      },
    ],
  },
  {
    group: 'Reports',
    permissions: [{ key: 'reports.view', label: 'View reports' }],
  },
  {
    group: 'Clinical Note Templates',
    permissions: [
      { key: 'note-templates.view', label: 'View / use note templates' },
      { key: 'note-templates.manage', label: 'Manage note templates' },
    ],
  },
  {
    group: 'HR — Staff',
    permissions: [
      { key: 'hr.staff.view', label: 'View staff' },
      { key: 'hr.staff.manage', label: 'Manage staff' },
    ],
  },
  {
    group: 'HR — Employment',
    permissions: [
      { key: 'hr.employees.view', label: 'View employment' },
      { key: 'hr.employees.manage', label: 'Manage employment' },
    ],
  },
  {
    group: 'HR — Attendance',
    permissions: [
      { key: 'hr.attendance.view', label: 'View attendance' },
      { key: 'hr.attendance.manage', label: 'Mark attendance' },
    ],
  },
  {
    group: 'HR — Leave',
    permissions: [
      { key: 'hr.leave.view', label: 'View leave requests' },
      { key: 'hr.leave.manage', label: 'Create / approve leave' },
    ],
  },
  {
    group: 'HR — Payroll',
    permissions: [
      { key: 'hr.payroll.view', label: 'View payroll' },
      { key: 'hr.payroll.manage', label: 'Manage payroll' },
    ],
  },
  {
    group: 'HR — Reports',
    permissions: [{ key: 'hr.reports.view', label: 'View HR reports' }],
  },
];

/** Flat list of every permission key. */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

/** Every HR-module permission key. */
const HR_PERMISSION_KEYS: string[] = ALL_PERMISSION_KEYS.filter((k) =>
  k.startsWith('hr.'),
);

/** Roles whose permissions can be configured in the matrix. */
export const CONFIGURABLE_ROLES: Role[] = [
  Role.CLINIC_ADMIN,
  Role.PHYSIOTHERAPIST,
  Role.FRONTEND_OFFICER,
  Role.HR,
];

/**
 * Fallback permissions used when no row exists in the DB yet.
 *
 * Role hierarchy:
 * - Clinic Admin runs the clinic: every operational permission plus the full
 *   HR module (staff accounts, employment, attendance, leave, payroll, reports).
 * - HR owns the whole HR module: staff accounts, employment, attendance, leave,
 *   payroll and HR reports (scoped to their own clinic).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Clinic admin gets every permission, including the full HR module.
  [Role.CLINIC_ADMIN]: [...ALL_PERMISSION_KEYS],
  // HR role owns the entire HR module (staff accounts + operational records).
  [Role.HR]: [...HR_PERMISSION_KEYS],
  [Role.PHYSIOTHERAPIST]: [
    'dashboard.view',
    'patients.view',
    'patients.create',
    'patients.edit',
    'consultations.view',
    'consultations.create',
    'consultations.edit',
    'visit-history.view',
    'payments.view',
    'payments.update',
    'machines.view',
    // View and use (but not manage) clinical-note templates.
    'note-templates.view',
  ],
  // Front-desk officer: runs reception — registers patients, books visits and
  // takes payments. No HR, no reports, no delete/manage rights.
  [Role.FRONTEND_OFFICER]: [
    'dashboard.view',
    'patients.view',
    'patients.create',
    'patients.edit',
    'consultations.view',
    'consultations.create',
    'consultations.edit',
    'visit-history.view',
    'payments.view',
    'payments.update',
    'machines.view',
    'note-templates.view',
  ],
};
