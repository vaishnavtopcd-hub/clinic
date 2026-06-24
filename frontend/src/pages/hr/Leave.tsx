import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type {
  Paginated,
  LeaveRequest,
  Employee,
  Clinic,
  LeaveType,
  LeaveStatus,
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
import { formatDate } from '../../lib/format';
import { DateRangeFilter } from '../../components/DateRangeFilter';

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
];

const typeLabel = (t: LeaveType) =>
  LEAVE_TYPES.find((x) => x.value === t)?.label ?? t;

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles: Record<LeaveStatus, string> = {
    PENDING: 'bg-warning/15 text-warning',
    APPROVED: 'bg-success/15 text-success',
    REJECTED: 'bg-error/15 text-error',
  };
  const label =
    status === 'PENDING'
      ? 'Pending'
      : status === 'APPROVED'
        ? 'Approved'
        : 'Rejected';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {label}
    </span>
  );
}

export default function Leave() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canManage = can('hr.leave.manage');

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');
  const [empFilter, setEmpFilter] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    type: 'CASUAL' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    clinicId: '',
  });

  // Super admin needs the clinic list to filter and scope the employee dropdown.
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
      'hr-leave',
      page,
      statusFilter,
      typeFilter,
      empFilter,
      clinicId,
      dateFrom,
      dateTo,
    ],
    queryFn: async () =>
      (
        await api.get<Paginated<LeaveRequest>>('/hr/leave', {
          params: {
            page,
            limit: 10,
            status: statusFilter || undefined,
            type: typeFilter || undefined,
            employeeId: empFilter || undefined,
            clinicId: clinicId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/hr/leave', {
        employeeId: form.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
        clinicId: isSuper ? form.clinicId || undefined : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-leave'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const review = useMutation({
    mutationFn: async ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      reviewNote?: string;
    }) =>
      api.patch(`/hr/leave/${id}/review`, {
        status,
        reviewNote: reviewNote || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-leave'] }),
  });

  const openCreate = () => {
    setForm({
      employeeId: '',
      type: 'CASUAL',
      startDate: '',
      endDate: '',
      reason: '',
      clinicId: '',
    });
    setError('');
    setModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle="Leave requests and approvals"
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + New Leave Request
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LeaveStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            className="input max-w-[160px]"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as LeaveType | '');
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            className="input max-w-[200px]"
            value={empFilter}
            onChange={(e) => {
              setEmpFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All employees</option>
            {employees.data?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>

          {isSuper && (
            <select
              className="input max-w-[200px]"
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
          <EmptyState message="No leave requests found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((l) => (
                  <tr key={l.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {l.employee?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {typeLabel(l.type)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(l.startDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(l.endDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.reason || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'PENDING' && canManage ? (
                        <div className="flex justify-end gap-3">
                          <button
                            className="text-success hover:underline disabled:opacity-50"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({ id: l.id, status: 'APPROVED' })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="text-error hover:underline disabled:opacity-50"
                            disabled={review.isPending}
                            onClick={() => {
                              const note =
                                window.prompt(
                                  'Reason for rejection (optional):',
                                ) ?? undefined;
                              review.mutate({
                                id: l.id,
                                status: 'REJECTED',
                                reviewNote: note,
                              });
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
        title="New Leave Request"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            create.mutate();
          }}
          className="space-y-4"
        >
          {isSuper && (
            <Field label="Clinic" required>
              <select
                className="input"
                value={form.clinicId}
                onChange={(e) =>
                  setForm({ ...form, clinicId: e.target.value, employeeId: '' })
                }
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

          <Field label="Employee" required>
            <select
              className="input"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            >
              <option value="">Select employee…</option>
              {employees.data?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type" required>
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as LeaveType })
              }
              required
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Start Date" required>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </Field>

          <Field label="End Date" required>
            <input
              type="date"
              className="input"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </Field>

          <Field label="Reason">
            <textarea
              className="input"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>

          <ErrorText message={error} />
          <div className="flex justify-end gap-2">
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
              disabled={create.isPending}
            >
              {create.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
