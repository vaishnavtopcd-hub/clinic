import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type {
  Paginated,
  Payroll,
  Employee,
  Clinic,
  PayrollStatus,
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
} from '../../components/ui';
import { currency, todayISO } from '../../lib/format';
import { DateRangeFilter } from '../../components/DateRangeFilter';

function PayrollBadge({ status }: { status: PayrollStatus }) {
  return status === 'PAID' ? (
    <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
      Paid
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-semibold text-error">
      Unpaid
    </span>
  );
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canManage = can('hr.payroll.manage');

  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | ''>('');
  const [empFilter, setEmpFilter] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    periodMonth: currentMonth(),
    baseSalary: '',
    allowances: '0',
    deductions: '0',
    status: 'UNPAID' as PayrollStatus,
    notes: '',
    clinicId: '',
  });

  // Super admin can scope all queries to a specific clinic.
  const clinics = useQuery({
    queryKey: ['clinics-all'],
    enabled: isSuper,
    queryFn: async () =>
      (await api.get<Paginated<Clinic>>('/clinics', { params: { limit: 100 } }))
        .data,
  });

  const employees = useQuery({
    queryKey: ['hr-employees-active', clinicId],
    queryFn: async () =>
      (
        await api.get<Employee[]>('/hr/employees/active', {
          params: { clinicId: clinicId || undefined },
        })
      ).data,
  });

  const list = useQuery({
    queryKey: [
      'hr-payroll',
      page,
      monthFilter,
      statusFilter,
      empFilter,
      clinicId,
      dateFrom,
      dateTo,
    ],
    queryFn: async () =>
      (
        await api.get<Paginated<Payroll>>('/hr/payroll', {
          params: {
            page,
            limit: 10,
            periodMonth: monthFilter || undefined,
            status: statusFilter || undefined,
            employeeId: empFilter || undefined,
            clinicId: clinicId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(`/hr/payroll/${editing.id}`, {
          baseSalary: Number(form.baseSalary),
          allowances: Number(form.allowances),
          deductions: Number(form.deductions),
          status: form.status,
          notes: form.notes || undefined,
        });
      }
      return api.post('/hr/payroll', {
        employeeId: form.employeeId,
        periodMonth: form.periodMonth,
        baseSalary: Number(form.baseSalary),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        status: form.status,
        notes: form.notes || undefined,
        clinicId: isSuper ? form.clinicId || undefined : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-payroll'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: async (p: Payroll) =>
      api.patch(`/hr/payroll/${p.id}`, {
        status: p.status === 'PAID' ? 'UNPAID' : 'PAID',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-payroll'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/payroll/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-payroll'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      employeeId: '',
      periodMonth: currentMonth(),
      baseSalary: '',
      allowances: '0',
      deductions: '0',
      status: 'UNPAID',
      notes: '',
      clinicId: '',
    });
    setError('');
    setModal(true);
  };

  const openEdit = (p: Payroll) => {
    setEditing(p);
    setForm({
      employeeId: p.employeeId,
      periodMonth: p.periodMonth,
      baseSalary: String(p.baseSalary),
      allowances: String(p.allowances),
      deductions: String(p.deductions),
      status: p.status,
      notes: p.notes ?? '',
      clinicId: p.clinicId ?? '',
    });
    setError('');
    setModal(true);
  };

  const onSelectEmployee = (id: string) => {
    const emp = employees.data?.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      employeeId: id,
      baseSalary: emp ? String(emp.baseSalary) : f.baseSalary,
    }));
  };

  const onDelete = (p: Payroll) => {
    if (window.confirm('Delete this payroll record?')) remove.mutate(p.id);
  };

  const netPreview =
    Number(form.baseSalary || 0) +
    Number(form.allowances || 0) -
    Number(form.deductions || 0);

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Salaries, deductions and payment status"
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Generate Payroll
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <input
            type="month"
            className="input max-w-[12rem]"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[10rem]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PayrollStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
          <select
            className="input max-w-[14rem]"
            value={empFilter}
            onChange={(e) => {
              setEmpFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All employees</option>
            {employees.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
          {isSuper && (
            <select
              className="input max-w-[14rem]"
              value={clinicId}
              onChange={(e) => {
                setClinicId(e.target.value);
                setEmpFilter('');
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
          <EmptyState message="No payroll records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Allowances</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Pay</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.periodMonth}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.employee?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(p.baseSalary)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(p.allowances)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(p.deductions)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {currency(p.netPay)}
                    </td>
                    <td className="px-4 py-3">
                      <PayrollBadge status={p.status} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            className="text-primary hover:underline"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            className={
                              p.status === 'UNPAID'
                                ? 'text-success hover:underline'
                                : 'text-muted-foreground hover:underline'
                            }
                            disabled={toggleStatus.isPending}
                            onClick={() => toggleStatus.mutate(p)}
                          >
                            {p.status === 'UNPAID' ? 'Mark Paid' : 'Mark Unpaid'}
                          </button>
                          <button
                            className="text-error hover:underline"
                            disabled={remove.isPending}
                            onClick={() => onDelete(p)}
                          >
                            Delete
                          </button>
                        </div>
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
        title={editing ? 'Edit Payroll' : 'Generate Payroll'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Employee" required>
            <select
              className="input disabled:bg-muted"
              value={form.employeeId}
              disabled={!!editing}
              onChange={(e) => onSelectEmployee(e.target.value)}
              required
            >
              <option value="">Select employee…</option>
              {employees.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Month" required>
            <input
              type="month"
              className="input disabled:bg-muted"
              value={form.periodMonth}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
              required
            />
          </Field>

          <Field label="Base Salary">
            <input
              type="number"
              className="input"
              value={form.baseSalary}
              onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Allowances">
              <input
                type="number"
                className="input"
                value={form.allowances}
                onChange={(e) =>
                  setForm({ ...form, allowances: e.target.value })
                }
              />
            </Field>
            <Field label="Deductions">
              <input
                type="number"
                className="input"
                value={form.deductions}
                onChange={(e) =>
                  setForm({ ...form, deductions: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Net Pay: </span>
            <span className="font-semibold text-foreground">
              {currency(netPreview)}
            </span>
          </div>

          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as PayrollStatus })
              }
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

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
              {save.isPending
                ? 'Saving…'
                : editing
                  ? 'Update'
                  : 'Generate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
