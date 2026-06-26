import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { api, apiError, fetchAllPaginated } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type { Paginated, User, Clinic, Role } from '../../lib/types';
import { ROLES, ROLE_LABELS } from '../../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Pagination,
  Modal,
  Field,
  ErrorText,
  StatusPill,
} from '../../components/ui';
import { formatDate } from '../../lib/format';
import { ExportMenu } from '../../components/ExportMenu';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import type { ExportColumn } from '../../lib/export';

const EXPORT_COLUMNS: ExportColumn<User>[] = [
  { header: 'Name', value: (u) => u.name },
  { header: 'Email', value: (u) => u.email },
  { header: 'Username', value: (u) => u.username ?? '' },
  { header: 'Phone', value: (u) => u.phone ?? '' },
  { header: 'Role', value: (u) => ROLE_LABELS[u.role] },
  { header: 'Department', value: (u) => u.department ?? '' },
  { header: 'Clinic', value: (u) => u.clinic?.name ?? '' },
  { header: 'Status', value: (u) => (u.isActive ? 'Active' : 'Inactive') },
  { header: 'Joined', value: (u) => (u.createdAt ? formatDate(u.createdAt) : '') },
];

type SortBy = 'name' | 'email' | 'role' | 'createdAt';
type Order = 'ASC' | 'DESC';

const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: 'bg-primary/15 text-primary',
  CLINIC_ADMIN: 'bg-info/15 text-info',
  PHYSIOTHERAPIST: 'bg-success/15 text-success',
  FRONTEND_OFFICER: 'bg-warning/15 text-warning',
  HR: 'bg-accent/15 text-accent',
};

/** Read an image file, downscale to <=256px, return a small base64 data URL. */
function fileToDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Avatar({
  user,
  large,
}: {
  user: { name: string; photoUrl?: string };
  large?: boolean;
}) {
  const box = large ? 'h-16 w-16' : 'h-9 w-9';
  return user.photoUrl ? (
    <img
      src={user.photoUrl}
      alt={user.name}
      className={`${box} rounded-full object-cover shadow-sm`}
    />
  ) : (
    <div
      className={`${box} flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 ${
        large ? 'text-xl' : 'text-sm'
      } font-semibold text-white shadow-sm`}
    >
      {user.name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function Staff() {
  const qc = useQueryClient();
  const { user: me, can } = useAuth();
  const isSuper = me?.role === 'SUPER_ADMIN';
  const canManage = can('hr.staff.manage');
  // Super admin may assign any role; a clinic admin may only create HR,
  // Physiotherapist or Frontend Officer staff (never another admin).
  // Mirrors the backend guard.
  const availableRoles: Role[] = isSuper
    ? ROLES
    : (['HR', 'PHYSIOTHERAPIST', 'FRONTEND_OFFICER'] as Role[]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [clinicId, setClinicId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [order, setOrder] = useState<Order>('DESC');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm(isSuper));
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['hr-staff', page, search, roleFilter, statusFilter, clinicId, dateFrom, dateTo, sortBy, order],
    queryFn: async () =>
      (
        await api.get<Paginated<User>>('/hr/staff', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
            clinicId: clinicId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            sortBy,
            order,
          },
        })
      ).data,
  });

  const clinics = useQuery({
    queryKey: ['clinics-all'],
    enabled: isSuper,
    queryFn: async () =>
      (await api.get<Paginated<Clinic>>('/clinics', { params: { limit: 100 } }))
        .data,
  });

  const fetchExport = () =>
    fetchAllPaginated<User>('/hr/staff', {
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      clinicId: clinicId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      order,
    });

  const save = useMutation({
    mutationFn: async () => {
      const isPhysio = form.role === 'PHYSIOTHERAPIST';
      const base = {
        name: form.name,
        email: form.email,
        role: form.role,
        username: form.username.trim() || undefined,
        phone: form.phone || undefined,
        department: form.department || undefined,
        specialization: isPhysio ? form.specialization || undefined : undefined,
        isActive: form.isActive,
        ...(isSuper && form.role !== 'SUPER_ADMIN'
          ? { clinicId: form.clinicId || undefined }
          : {}),
      };
      if (editing) {
        return api.patch(`/hr/staff/${editing.id}`, {
          ...base,
          photoUrl: form.photoUrl, // raw: '' clears, data URL sets
          ...(form.password ? { password: form.password } : {}),
        });
      }
      return api.post('/hr/staff', {
        ...base,
        password: form.password,
        photoUrl: form.photoUrl || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-staff'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const toggle = useMutation({
    mutationFn: async (u: User) =>
      api.patch(`/hr/staff/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-staff'] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-staff'] }),
    onError: (e) => window.alert(apiError(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(isSuper));
    setError('');
    setModal(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      username: u.username ?? '',
      phone: u.phone ?? '',
      role: u.role,
      clinicId: u.clinicId ?? '',
      department: u.department ?? '',
      specialization: u.specialization ?? '',
      isActive: u.isActive,
      password: '',
      photoUrl: u.photoUrl ?? '',
    });
    setError('');
    setModal(true);
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSort = (col: SortBy) => {
    if (sortBy === col) setOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(col);
      setOrder('ASC');
    }
    setPage(1);
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch {
      setError('Could not read that image');
    }
  };

  // Per-row permissions: only a super admin may edit admin accounts
  // (Super Admin or Clinic Admin).
  const canTouch = (u: User) =>
    isSuper || (u.role !== 'SUPER_ADMIN' && u.role !== 'CLINIC_ADMIN');
  const isSelf = (u: User) => u.id === me?.id;

  const SortHead = ({ col, label }: { col: SortBy; label: string }) => (
    <th className="px-4 py-3">
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(col)}
      >
        {label}
        {sortBy === col &&
          (order === 'ASC' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Manage all clinic staff, their roles and access"
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Add Staff
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <input
            className="input max-w-xs"
            placeholder="Search by name, email, username, phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[170px]"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | '');
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[150px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {isSuper && (
            <select
              className="input max-w-[200px]"
              value={clinicId}
              onChange={(e) => {
                setClinicId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All clinics</option>
              {clinics.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
              setPage(1);
            }}
          />
          <div className="ml-auto">
            <ExportMenu
              filename="staff"
              title="Staff"
              columns={EXPORT_COLUMNS}
              fetchRows={fetchExport}
            />
          </div>
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message="No staff found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <SortHead col="name" label="Name" />
                  <SortHead col="role" label="Role" />
                  <th className="px-4 py-3">Department</th>
                  {isSuper && <th className="px-4 py-3">Clinic</th>}
                  <th className="px-4 py-3">Status</th>
                  <SortHead col="createdAt" label="Joined" />
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((u) => (
                  <tr key={u.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div className="min-w-0">
                          <p className="font-medium">
                            <Link
                              to={`/hr/staff/${u.id}`}
                              className="text-foreground hover:text-primary hover:underline"
                            >
                              {u.name}
                            </Link>
                            {isSelf(u) && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                            {u.username ? ` · @${u.username}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.department || '—'}
                    </td>
                    {isSuper && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.clinic?.name ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <StatusPill active={u.isActive} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.createdAt ? formatDate(u.createdAt) : '—'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canTouch(u) ? (
                          <>
                            <button
                              className="text-primary hover:underline"
                              onClick={() => openEdit(u)}
                            >
                              Edit
                            </button>
                            {!isSelf(u) && (
                              <button
                                className="ml-3 text-muted-foreground hover:underline"
                                onClick={() => toggle.mutate(u)}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                            {!isSelf(u) && (
                              <button
                                className="ml-3 text-error hover:underline"
                                onClick={() => {
                                  if (window.confirm(`Delete ${u.name}?`))
                                    del.mutate(u.id);
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            read-only
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={list.data.totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Staff' : 'Add Staff'}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {/* Profile photo */}
          <div className="sm:col-span-2 flex items-center gap-4">
            <Avatar user={{ name: form.name || '?', photoUrl: form.photoUrl }} large />
            <div className="flex items-center gap-2">
              <label className="btn-secondary cursor-pointer">
                {form.photoUrl ? 'Change photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
              </label>
              {form.photoUrl && (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:underline"
                  onClick={() => set('photoUrl', '')}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <Field label="Name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </Field>
          <Field label="Username">
            <input
              className="input"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>
          <Field label="Role" required>
            <select
              className="input"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              required
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          {isSuper && form.role !== 'SUPER_ADMIN' && (
            <Field label="Clinic" required>
              <select
                className="input"
                value={form.clinicId}
                onChange={(e) => set('clinicId', e.target.value)}
                required
              >
                <option value="">Select clinic…</option>
                {clinics.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.role === 'PHYSIOTHERAPIST' && (
            <Field label="Specialization">
              <input
                className="input"
                value={form.specialization}
                onChange={(e) => set('specialization', e.target.value)}
              />
            </Field>
          )}
          <Field label="Department">
            <input
              className="input"
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.value === 'ACTIVE' }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field
            label={editing ? 'New Password (leave blank to keep)' : 'Password'}
            required={!editing}
          >
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required={!editing}
              minLength={6}
            />
          </Field>

          <div className="sm:col-span-2">
            <ErrorText message={error} />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={save.isPending}
              >
                {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function emptyForm(isSuper: boolean) {
  return {
    name: '',
    email: '',
    username: '',
    phone: '',
    role: (isSuper ? 'CLINIC_ADMIN' : 'PHYSIOTHERAPIST') as Role,
    clinicId: '',
    department: '',
    specialization: '',
    isActive: true,
    password: '',
    photoUrl: '',
  };
}
