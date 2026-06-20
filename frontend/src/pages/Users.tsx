import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Paginated, User, Clinic, Role } from '../lib/types';
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
} from '../components/ui';

export default function Users() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canManage = isSuper || can('users.manage');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    role: (isSuper ? 'CLINIC_ADMIN' : 'PHYSIOTHERAPIST') as Role,
    clinicId: '',
    isActive: true,
  });

  // Super admin needs the clinic list to assign clinic admins.
  const clinics = useQuery({
    queryKey: ['clinics-all'],
    enabled: isSuper,
    queryFn: async () =>
      (await api.get<Paginated<Clinic>>('/clinics', { params: { limit: 100 } }))
        .data,
  });

  const list = useQuery({
    queryKey: ['users', page, search, isSuper],
    queryFn: async () =>
      (
        await api.get<Paginated<User>>('/users', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            role: isSuper ? 'CLINIC_ADMIN' : 'PHYSIOTHERAPIST',
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(`/users/${editing.id}`, {
          name: form.name,
          phone: form.phone || undefined,
          specialization: form.specialization || undefined,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      }
      return api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        specialization: form.specialization || undefined,
        role: form.role,
        clinicId: isSuper ? form.clinicId || undefined : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      specialization: '',
      role: isSuper ? 'CLINIC_ADMIN' : 'PHYSIOTHERAPIST',
      clinicId: '',
      isActive: true,
    });
    setError('');
    setModal(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone ?? '',
      specialization: u.specialization ?? '',
      role: u.role,
      clinicId: u.clinicId ?? '',
      isActive: u.isActive,
    });
    setError('');
    setModal(true);
  };

  const title = isSuper ? 'Clinic Admins' : 'Physiotherapists';

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={
          isSuper
            ? 'Manage clinic administrators'
            : 'Manage physiotherapists in your clinic'
        }
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Add {isSuper ? 'Clinic Admin' : 'Physiotherapist'}
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="border-b border-border p-4">
          <input
            className="input max-w-sm"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message={`No ${title.toLowerCase()} found`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  {isSuper ? (
                    <th className="px-4 py-3">Clinic</th>
                  ) : (
                    <th className="px-4 py-3">Specialization</th>
                  )}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((u) => (
                  <tr key={u.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isSuper ? u.clinic?.name ?? '—' : u.specialization || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={u.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <button
                          className="text-primary hover:underline"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">read-only</span>
                      )}
                    </td>
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
        title={editing ? 'Edit User' : `Add ${isSuper ? 'Clinic Admin' : 'Physiotherapist'}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className="input disabled:bg-muted"
              value={form.email}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required={!editing}
            />
          </Field>
          <Field label={editing ? 'New Password (leave blank to keep)' : 'Password'} required={!editing}>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          {!isSuper && (
            <Field label="Specialization">
              <input
                className="input"
                value={form.specialization}
                onChange={(e) =>
                  setForm({ ...form, specialization: e.target.value })
                }
              />
            </Field>
          )}
          {isSuper && !editing && (
            <Field label="Clinic" required>
              <select
                className="input"
                value={form.clinicId}
                onChange={(e) => setForm({ ...form, clinicId: e.target.value })}
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
          {editing && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          )}
          <ErrorText message={error} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
