import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError, fetchAllPaginated } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type {
  Paginated,
  Attendance,
  Employee,
  Clinic,
  AttendanceStatus,
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
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ExportMenu } from '../../components/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { formatDate, todayISO } from '../../lib/format';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
};

const STATUS_VALUES: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
];

const EXPORT_COLUMNS: ExportColumn<Attendance>[] = [
  { header: 'Date', value: (a) => formatDate(a.date) },
  { header: 'Employee', value: (a) => a.employee?.fullName ?? '' },
  { header: 'Status', value: (a) => STATUS_LABELS[a.status] },
  { header: 'Check In', value: (a) => a.checkIn ?? '' },
  { header: 'Check Out', value: (a) => a.checkOut ?? '' },
  { header: 'Notes', value: (a) => a.notes ?? '' },
];

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    PRESENT: 'bg-success/15 text-success',
    ABSENT: 'bg-error/15 text-error',
    HALF_DAY: 'bg-warning/15 text-warning',
    ON_LEAVE: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AttendancePage() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canManage = can('hr.attendance.manage');

  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('');
  const [clinicId, setClinicId] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    date: todayISO(),
    status: 'PRESENT' as AttendanceStatus,
    checkIn: '',
    checkOut: '',
    notes: '',
  });

  // Super admin needs the clinic list for the filter / context.
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
      'hr-attendance',
      page,
      dateFilter,
      empFilter,
      statusFilter,
      clinicId,
      dateFrom,
      dateTo,
    ],
    queryFn: async () =>
      (
        await api.get<Paginated<Attendance>>('/hr/attendance', {
          params: {
            page,
            limit: 10,
            date: dateFilter || undefined,
            employeeId: empFilter || undefined,
            status: statusFilter || undefined,
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
        return api.patch(`/hr/attendance/${editing.id}`, {
          status: form.status,
          checkIn: form.checkIn || undefined,
          checkOut: form.checkOut || undefined,
          notes: form.notes || undefined,
        });
      }
      return api.post('/hr/attendance', {
        employeeId: form.employeeId,
        date: form.date,
        status: form.status,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-attendance'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/attendance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-attendance'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      employeeId: '',
      date: todayISO(),
      status: 'PRESENT',
      checkIn: '',
      checkOut: '',
      notes: '',
    });
    setError('');
    setModal(true);
  };

  const openEdit = (a: Attendance) => {
    setEditing(a);
    setForm({
      employeeId: a.employeeId,
      date: a.date.slice(0, 10),
      status: a.status,
      checkIn: a.checkIn ?? '',
      checkOut: a.checkOut ?? '',
      notes: a.notes ?? '',
    });
    setError('');
    setModal(true);
  };

  const handleDelete = (a: Attendance) => {
    if (window.confirm('Delete this attendance record?')) {
      remove.mutate(a.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily staff attendance"
        action={
          <div className="flex gap-2">
            <ExportMenu
              filename="attendance"
              title="Attendance"
              columns={EXPORT_COLUMNS}
              fetchRows={() =>
                fetchAllPaginated<Attendance>('/hr/attendance', {
                  date: dateFilter || undefined,
                  employeeId: empFilter || undefined,
                  status: statusFilter || undefined,
                  clinicId: clinicId || undefined,
                  dateFrom: dateFrom || undefined,
                  dateTo: dateTo || undefined,
                })
              }
            />
            {canManage && (
              <button className="btn-primary" onClick={openCreate}>
                + Mark Attendance
              </button>
            )}
          </div>
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <input
            type="date"
            className="input max-w-[180px]"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[220px]"
            value={empFilter}
            onChange={(e) => {
              setEmpFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All employees</option>
            {employees.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.employeeCode})
              </option>
            ))}
          </select>
          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AttendanceStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {isSuper && (
            <select
              className="input max-w-[220px]"
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
          <EmptyState message="No attendance records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                  <th className="px-4 py-3">Notes</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((a) => (
                  <tr key={a.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(a.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.employee?.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <AttendanceBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.checkIn || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.checkOut || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.notes || '—'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            className="text-primary hover:underline"
                            onClick={() => openEdit(a)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-error hover:underline"
                            onClick={() => handleDelete(a)}
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
        title={editing ? 'Edit Attendance' : 'Mark Attendance'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="space-y-4"
        >
          {isSuper && !editing && (
            <Field label="Clinic" required>
              <select
                className="input"
                value={clinicId}
                onChange={(e) => {
                  setClinicId(e.target.value);
                  setForm({ ...form, employeeId: '' });
                }}
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
              className="input disabled:bg-muted"
              value={form.employeeId}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            >
              <option value="">Select employee…</option>
              {employees.data?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <input
              type="date"
              className="input disabled:bg-muted"
              value={form.date}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </Field>
          <Field label="Status" required>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AttendanceStatus })
              }
              required
            >
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Check In">
              <input
                type="time"
                className="input"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              />
            </Field>
            <Field label="Check Out">
              <input
                type="time"
                className="input"
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              disabled={save.isPending}
            >
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Mark'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
