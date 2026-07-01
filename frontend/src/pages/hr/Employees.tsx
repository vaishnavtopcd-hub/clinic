import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type {
  Paginated,
  Employee,
  Physiotherapist,
  Clinic,
  EmploymentType,
  EmployeeStatus,
} from '../../lib/types';
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
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { currency, formatDate, todayISO } from '../../lib/format';

const TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
};

const empty = {
  userId: '',
  designation: '',
  employmentType: 'FULL_TIME' as EmploymentType,
  dateOfJoining: '',
  baseSalary: '',
  status: 'ACTIVE' as EmployeeStatus,
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  clinicId: '',
};

export default function Employment() {
  const qc = useQueryClient();
  const { user, can } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canManage = can('hr.employees.manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | ''>('');
  const [clinicId, setClinicId] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['hr-employees', page, search, statusFilter, clinicId, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<Employee>>('/hr/employees', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            status: statusFilter || undefined,
            clinicId: clinicId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  // Super admin needs the clinic list (filter + create context).
  const clinics = useQuery({
    queryKey: ['clinics-all'],
    enabled: isSuper,
    queryFn: async () =>
      (await api.get<Paginated<Clinic>>('/clinics', { params: { limit: 100 } }))
        .data,
  });

  // Physiotherapist accounts that can be linked (create modal only).
  const physioClinic = isSuper ? form.clinicId : undefined;
  const physios = useQuery({
    queryKey: ['hr-physios', physioClinic],
    enabled: modal && !editing && (!isSuper || !!form.clinicId),
    queryFn: async () =>
      (
        await api.get<Physiotherapist[]>('/hr/employees/physiotherapists', {
          params: { clinicId: physioClinic || undefined },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const common = {
        designation: form.designation || undefined,
        employmentType: form.employmentType,
        dateOfJoining: form.dateOfJoining || undefined,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        status: form.status,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        emergencyContact: form.emergencyContact || undefined,
      };
      if (editing) return api.patch(`/hr/employees/${editing.id}`, common);
      return api.post('/hr/employees', {
        ...common,
        userId: form.userId,
        clinicId: isSuper ? form.clinicId || undefined : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-employees'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-employees'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setError('');
    setModal(true);
  };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      userId: e.userId ?? '',
      designation: e.designation ?? '',
      employmentType: e.employmentType,
      dateOfJoining: e.dateOfJoining ?? '',
      baseSalary: e.baseSalary?.toString() ?? '',
      status: e.status,
      phone: e.phone ?? '',
      email: e.email ?? '',
      address: e.address ?? '',
      emergencyContact: e.emergencyContact ?? '',
      clinicId: e.clinicId,
    });
    setError('');
    setModal(true);
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Prefill designation from the chosen physiotherapist's specialization.
  const onPickPhysio = (id: string) => {
    const p = physios.data?.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      userId: id,
      designation: f.designation || p?.specialization || '',
    }));
  };

  return (
    <div>
      <PageHeader
        title="Employment"
        subtitle="Employment records used for payroll, attendance and leave"
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Add Employment
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <input
            className="input max-w-xs"
            placeholder="Search by name, code, phone, email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as EmployeeStatus | '');
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
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message="No employment records yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((e) => (
                  <tr key={e.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-mono text-xs">
                      {e.employeeCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {e.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.designation || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[e.employmentType]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.dateOfJoining ? formatDate(e.dateOfJoining) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(e.baseSalary)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={e.status === 'ACTIVE'} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => openEdit(e)}
                        >
                          Edit
                        </button>
                        <button
                          className="ml-3 text-error hover:underline"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove the employment record for ${e.fullName}?`,
                              )
                            )
                              del.mutate(e.id);
                          }}
                        >
                          Delete
                        </button>
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
        title={editing ? `Edit Employment — ${editing.fullName}` : 'Add Employment'}
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
          {!editing && isSuper && (
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

          {editing ? (
            <Field label="Physiotherapist">
              <input className="input" value={editing.fullName} disabled />
            </Field>
          ) : (
            <Field label="Physiotherapist" required>
              <select
                className="input"
                value={form.userId}
                onChange={(e) => onPickPhysio(e.target.value)}
                required
                disabled={isSuper && !form.clinicId}
              >
                <option value="">
                  {isSuper && !form.clinicId
                    ? 'Select a clinic first…'
                    : physios.isLoading
                      ? 'Loading…'
                      : 'Select physiotherapist…'}
                </option>
                {physios.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.specialization ? ` · ${p.specialization}` : ''}
                  </option>
                ))}
              </select>
              {!isSuper &&
                !physios.isLoading &&
                physios.data &&
                physios.data.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    All physiotherapists already have an employment record.
                  </p>
                )}
            </Field>
          )}

          <Field label="Designation">
            <input
              className="input"
              value={form.designation}
              onChange={(e) => set('designation', e.target.value)}
            />
          </Field>
          <Field label="Employment Type">
            <select
              className="input"
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value)}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </Field>
          <Field label="Date of Joining">
            <input
              type="date"
              className="input"
              value={form.dateOfJoining}
              onChange={(e) => set('dateOfJoining', e.target.value)}
            />
          </Field>
          <Field label="Base Salary">
            <input
              type="number"
              min={0}
              className="input"
              value={form.baseSalary}
              onChange={(e) => set('baseSalary', e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Emergency Contact">
            <input
              className="input"
              placeholder="Name / phone"
              value={form.emergencyContact}
              onChange={(e) => set('emergencyContact', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea
                className="input"
                rows={2}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
          </div>

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
                {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add Staff'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
