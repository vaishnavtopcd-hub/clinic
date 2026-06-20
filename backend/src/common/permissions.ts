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
    group: 'Reports',
    permissions: [{ key: 'reports.view', label: 'View reports' }],
  },
  {
    group: 'Users',
    permissions: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.manage', label: 'Manage users' },
    ],
  },
];

/** Flat list of every permission key. */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

/** Roles whose permissions can be configured in the matrix. */
export const CONFIGURABLE_ROLES: Role[] = [
  Role.CLINIC_ADMIN,
  Role.PHYSIOTHERAPIST,
];

/**
 * Fallback permissions used when no row exists in the DB yet.
 * Mirrors the original hard-coded RBAC behaviour.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [Role.CLINIC_ADMIN]: [...ALL_PERMISSION_KEYS],
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
  ],
};
