import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import type { Paginated, Clinic } from '../lib/types';
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
import { formatDate } from '../lib/format';

export default function Clinics() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const list = useQuery({
    queryKey: ['clinics', page, search],
    queryFn: async () =>
      (
        await api.get<Paginated<Clinic>>('/clinics', {
          params: { page, limit: 10, search: search || undefined },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(`/clinics/${editing.id}`, {
          name: form.name,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
        });
      }
      return api.post('/clinics', {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        adminName: form.adminName || undefined,
        adminEmail: form.adminEmail || undefined,
        adminPassword: form.adminPassword || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinics'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const toggle = useMutation({
    mutationFn: async (c: Clinic) =>
      api.patch(`/clinics/${c.id}/${c.isActive ? 'deactivate' : 'activate'}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinics'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      address: '',
      phone: '',
      email: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
    setError('');
    setModal(true);
  };
  const openEdit = (c: Clinic) => {
    setEditing(c);
    setForm({
      name: c.name,
      address: c.address ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
    setError('');
    setModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Clinics"
        subtitle="Manage all clinics in the system"
        action={
          <button className="btn-primary" onClick={openCreate}>
            + Create Clinic
          </button>
        }
      />

      <Card className="!p-0">
        <div className="border-b border-border p-4">
          <input
            className="input max-w-sm"
            placeholder="Search clinics…"
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
          <EmptyState message="No clinics yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.address}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.phone || '—'}
                      <br />
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={c.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        className="ml-3 text-muted-foreground hover:underline"
                        onClick={() => toggle.mutate(c)}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
        title={editing ? 'Edit Clinic' : 'Create Clinic'}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Clinic Name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>

          {!editing && (
            <div className="sm:col-span-2">
              <div className="mt-2 rounded-lg bg-muted p-4">
                <p className="mb-3 text-sm font-semibold text-muted-foreground">
                  First Clinic Admin (optional)
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Admin Name">
                    <input
                      className="input"
                      value={form.adminName}
                      onChange={(e) =>
                        setForm({ ...form, adminName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Admin Email">
                    <input
                      type="email"
                      className="input"
                      value={form.adminEmail}
                      onChange={(e) =>
                        setForm({ ...form, adminEmail: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Admin Password">
                    <input
                      type="password"
                      className="input"
                      value={form.adminPassword}
                      onChange={(e) =>
                        setForm({ ...form, adminPassword: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

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
