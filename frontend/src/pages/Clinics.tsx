import { useState, type CSSProperties } from 'react';
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
import { formatDate, todayISO } from '../lib/format';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { brandScaleVars, BRAND_PALETTE, DEFAULT_BRAND_HEX } from '../theme/brand';

export default function Clinics() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
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
    queryKey: ['clinics', page, search, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<Clinic>>('/clinics', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
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

  // --- Assign a Clinic Admin to an existing clinic ---
  const [adminModal, setAdminModal] = useState(false);
  const [adminFor, setAdminFor] = useState<Clinic | null>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminError, setAdminError] = useState('');

  const addAdmin = useMutation({
    mutationFn: async () =>
      api.post('/hr/staff', {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
        role: 'CLINIC_ADMIN',
        clinicId: adminFor!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinics'] });
      setAdminModal(false);
    },
    onError: (e) => setAdminError(apiError(e)),
  });

  const openAddAdmin = (c: Clinic) => {
    setAdminFor(c);
    setAdminForm({ name: '', email: '', password: '' });
    setAdminError('');
    setAdminModal(true);
  };

  // --- Theme / branding (super admin sets each clinic's primary colour) ---
  const [themeModal, setThemeModal] = useState(false);
  const [themeFor, setThemeFor] = useState<Clinic | null>(null);
  const [themeColor, setThemeColor] = useState(DEFAULT_BRAND_HEX);
  const [themeLogo, setThemeLogo] = useState('');

  const openTheme = (c: Clinic) => {
    setThemeFor(c);
    setThemeColor(c.settings?.theme?.primaryColor ?? DEFAULT_BRAND_HEX);
    setThemeLogo(c.settings?.theme?.logoUrl ?? '');
    setThemeModal(true);
  };

  const closeTheme = () => setThemeModal(false);

  // Save / reset only persist the clinic's colour. The app re-themes solely for
  // that clinic — its own users, and the super admin while scoped into it (the
  // Layout effect reacts to the refreshed clinics list); the super admin's
  // general view is left untouched.
  const saveTheme = useMutation({
    mutationFn: async () =>
      api.patch(`/clinics/${themeFor!.id}/theme`, {
        primaryColor: themeColor,
        logoUrl: themeLogo.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinics'] });
      qc.invalidateQueries({ queryKey: ['clinics-selector'] });
      setThemeModal(false);
    },
  });

  const resetTheme = useMutation({
    mutationFn: async () => api.delete(`/clinics/${themeFor!.id}/theme`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinics'] });
      qc.invalidateQueries({ queryKey: ['clinics-selector'] });
      setThemeModal(false);
    },
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
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <input
            className="input max-w-sm"
            placeholder="Search clinics…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
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
                  <th className="px-4 py-3">Clinic Admin</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-muted">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
                          style={{
                            backgroundColor:
                              c.settings?.theme?.primaryColor ?? DEFAULT_BRAND_HEX,
                          }}
                          title={
                            c.settings?.theme?.primaryColor
                              ? `Theme: ${c.settings.theme.primaryColor}`
                              : 'Default theme'
                          }
                        />
                        <p className="font-medium text-foreground">{c.name}</p>
                      </div>
                      <p className="ml-5 text-xs text-muted-foreground">
                        {c.address}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {c.admins && c.admins.length > 0 ? (
                        <div className="space-y-0.5">
                          {c.admins.map((a) => (
                            <div key={a.id}>
                              <span className="text-foreground">{a.name}</span>
                              {!a.isActive && (
                                <span className="ml-1 text-xs text-error">
                                  (inactive)
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {a.email}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => openAddAdmin(c)}
                        >
                          + Assign Admin
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {c.phone || '—'}
                      <br />
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill active={c.isActive} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-muted"
                          onClick={() => openAddAdmin(c)}
                        >
                          Add Admin
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
                          onClick={() => openTheme(c)}
                        >
                          Theme
                        </button>
                        <button
                          className="min-w-[88px] rounded-md border border-border px-2.5 py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          onClick={() => toggle.mutate(c)}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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

          {!editing &&
            (() => {
              // The admin trio is all-or-nothing: filling any one field makes
              // the other two required (mirrors the backend validation).
              const anyAdmin =
                !!form.adminName || !!form.adminEmail || !!form.adminPassword;
              return (
                <div className="sm:col-span-2">
                  <div className="mt-2 rounded-lg bg-muted p-4">
                    <p className="mb-1 text-sm font-semibold text-muted-foreground">
                      First Clinic Admin (optional)
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Assign a dedicated admin for this clinic. You can also add
                      one later from the clinic list.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Admin Name" required={anyAdmin}>
                        <input
                          className="input"
                          value={form.adminName}
                          required={anyAdmin}
                          onChange={(e) =>
                            setForm({ ...form, adminName: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Admin Email" required={anyAdmin}>
                        <input
                          type="email"
                          className="input"
                          value={form.adminEmail}
                          required={anyAdmin}
                          onChange={(e) =>
                            setForm({ ...form, adminEmail: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Admin Password" required={anyAdmin}>
                        <input
                          type="password"
                          className="input"
                          value={form.adminPassword}
                          required={anyAdmin}
                          minLength={6}
                          onChange={(e) =>
                            setForm({ ...form, adminPassword: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              );
            })()}

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

      <Modal
        open={adminModal}
        onClose={() => setAdminModal(false)}
        title={`Assign Clinic Admin${adminFor ? ` — ${adminFor.name}` : ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAdminError('');
            addAdmin.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Admin Name" required>
            <input
              className="input"
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm({ ...adminForm, name: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Admin Email" required>
            <input
              type="email"
              className="input"
              value={adminForm.email}
              onChange={(e) =>
                setAdminForm({ ...adminForm, email: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Admin Password" required>
            <input
              type="password"
              className="input"
              value={adminForm.password}
              onChange={(e) =>
                setAdminForm({ ...adminForm, password: e.target.value })
              }
              required
              minLength={6}
            />
          </Field>
          <ErrorText message={adminError} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAdminModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={addAdmin.isPending}
            >
              {addAdmin.isPending ? 'Assigning…' : 'Assign Admin'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={themeModal}
        onClose={closeTheme}
        title={`Theme${themeFor ? ` — ${themeFor.name}` : ''}`}
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Pick the clinic's primary brand colour. It applies across the
            clinic's portal — buttons, links, navigation, active states and
            icons. Changes preview live below.
          </p>

          <div>
            <p className="label">Palette</p>
            <div className="flex flex-wrap gap-2">
              {BRAND_PALETTE.map((p) => {
                const selected =
                  p.hex.toLowerCase() === themeColor.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    title={p.name}
                    onClick={() => setThemeColor(p.hex)}
                    className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition ${
                      selected ? 'ring-foreground' : 'ring-transparent'
                    }`}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <p className="label">Custom colour</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
              />
              <input
                className="input max-w-[160px] font-mono"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#7c4ee6"
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <p className="label">Logo image URL (optional)</p>
            <input
              className="input"
              value={themeLogo}
              onChange={(e) => setThemeLogo(e.target.value)}
              placeholder="https://…/logo.png"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Shown in the sidebar beside the clinic name. Leave blank to use the
              default icon.
            </p>
          </div>

          {/* Preview — scoped to this box only via local CSS variables, so it
              never recolours the rest of the app. */}
          <div
            className="rounded-lg border border-border p-4"
            style={
              /^#[0-9a-fA-F]{6}$/.test(themeColor)
                ? (brandScaleVars(themeColor) as CSSProperties)
                : undefined
            }
          >
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              Preview
            </p>
            {/* Sidebar header preview (logo + clinic name) */}
            <div className="mb-3 flex items-center gap-3">
              {themeLogo.trim() ? (
                <img
                  src={themeLogo.trim()}
                  alt={themeFor?.name ?? ''}
                  className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-border"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  {themeFor?.name?.[0]?.toUpperCase() ?? 'C'}
                </span>
              )}
              <span className="truncate text-base font-bold text-foreground">
                {themeFor?.name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary">
                Primary
              </button>
              <span className="font-medium text-primary">Link text</span>
              <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Badge
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm text-error hover:underline disabled:opacity-50"
              onClick={() => {
                setThemeColor(DEFAULT_BRAND_HEX);
                resetTheme.mutate();
              }}
              disabled={resetTheme.isPending || saveTheme.isPending}
            >
              Reset to default
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeTheme}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => saveTheme.mutate()}
                disabled={
                  saveTheme.isPending ||
                  !/^#[0-9a-fA-F]{6}$/.test(themeColor)
                }
              >
                {saveTheme.isPending ? 'Saving…' : 'Save Theme'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
