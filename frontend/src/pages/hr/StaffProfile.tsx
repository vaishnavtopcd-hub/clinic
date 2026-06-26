import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type {
  User,
  StaffPerformance,
  Role,
  AttendanceStatus,
  LeaveStatus,
  LeaveType,
} from '../../lib/types';
import { ROLE_LABELS } from '../../lib/types';
import {
  Card,
  StatCard,
  Spinner,
  EmptyState,
  StatusPill,
} from '../../components/ui';
import { formatDate } from '../../lib/format';

const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: 'bg-primary/15 text-primary',
  CLINIC_ADMIN: 'bg-info/15 text-info',
  PHYSIOTHERAPIST: 'bg-success/15 text-success',
  FRONTEND_OFFICER: 'bg-warning/15 text-warning',
  HR: 'bg-accent/15 text-accent',
};

const ATT_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success/15 text-success',
  ABSENT: 'bg-error/15 text-error',
  HALF_DAY: 'bg-warning/15 text-warning',
  ON_LEAVE: 'bg-muted text-muted-foreground',
};
const ATT_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
};

const LEAVE_BADGE: Record<LeaveStatus, string> = {
  PENDING: 'bg-warning/15 text-warning',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-error/15 text-error',
};
const LEAVE_TYPE: Record<LeaveType, string> = {
  CASUAL: 'Casual',
  SICK: 'Sick',
  PAID: 'Paid',
  UNPAID: 'Unpaid',
};

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();

  const staff = useQuery({
    queryKey: ['hr-staff', id],
    queryFn: async () => (await api.get<User>(`/hr/staff/${id}`)).data,
  });
  const perf = useQuery({
    queryKey: ['hr-staff-perf', id],
    queryFn: async () =>
      (await api.get<StaffPerformance>(`/hr/staff/${id}/performance`)).data,
  });

  if (staff.isLoading) return <Spinner />;
  const s = staff.data;
  if (!s) return <EmptyState message="Staff member not found" />;
  const p = perf.data;

  return (
    <div>
      <Link
        to="/hr/staff"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Staff
      </Link>

      {/* Profile header */}
      <Card className="mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {s.photoUrl ? (
            <img
              src={s.photoUrl}
              alt={s.name}
              className="h-16 w-16 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-semibold text-white shadow-sm">
              {s.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {s.name}
              </h1>
              <Badge cls={ROLE_BADGE[s.role]}>{ROLE_LABELS[s.role]}</Badge>
              <StatusPill active={s.isActive} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{s.email}</span>
              {s.username && <span>@{s.username}</span>}
              {s.phone && <span>{s.phone}</span>}
              {s.clinic?.name && <span>{s.clinic.name}</span>}
              {s.department && <span>{s.department}</span>}
            </div>
          </div>
        </div>
      </Card>

      {!p ? (
        <Spinner />
      ) : (
        <>
          {/* Performance metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Patients Treated"
              value={p.consultations.totalPatients}
            />
            <StatCard
              label="Today's Patients"
              value={p.consultations.todaysPatients}
              accent="text-primary"
            />
            <StatCard
              label="Consultations (Visits)"
              value={p.consultations.total}
              hint={`${p.consultations.today} today`}
            />
            <StatCard
              label="Last Consultation"
              value={
                p.consultations.lastDate
                  ? formatDate(p.consultations.lastDate)
                  : '—'
              }
            />
            <StatCard
              label="Working Days"
              value={p.attendance.workingDays}
              accent="text-success"
              hint={`${p.attendance.present} present · ${p.attendance.halfDay} half`}
            />
            <StatCard
              label="Absent Days"
              value={p.attendance.absent}
              accent={p.attendance.absent > 0 ? 'text-error' : 'text-foreground'}
            />
            <StatCard
              label="Leaves Taken"
              value={p.leave.approved}
              hint={`${p.leave.total} requests`}
            />
            <StatCard
              label="Pending Leaves"
              value={p.leave.pending}
              accent={p.leave.pending > 0 ? 'text-warning' : 'text-foreground'}
            />
          </div>

          {!p.hasEmployment && (
            <p className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              No employment record — attendance, working days and leave aren't
              tracked for this staff member yet. Add one under{' '}
              <Link to="/hr/employees" className="text-primary hover:underline">
                Employment
              </Link>
              .
            </p>
          )}

          {/* Attendance & leave history */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="!p-0">
              <h3 className="border-b border-border px-4 py-3 font-semibold text-foreground">
                Recent Attendance
              </h3>
              {p.attendance.history.length === 0 ? (
                <EmptyState message="No attendance records" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">In</th>
                        <th className="px-4 py-2">Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {p.attendance.history.map((a) => (
                        <tr key={a.id}>
                          <td className="px-4 py-2 text-muted-foreground">
                            {formatDate(a.date)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge cls={ATT_BADGE[a.status]}>
                              {ATT_LABEL[a.status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {a.checkIn || '—'}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {a.checkOut || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="!p-0">
              <h3 className="border-b border-border px-4 py-3 font-semibold text-foreground">
                Leave Records
              </h3>
              {p.leave.records.length === 0 ? (
                <EmptyState message="No leave records" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">From</th>
                        <th className="px-4 py-2">To</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {p.leave.records.map((l) => (
                        <tr key={l.id}>
                          <td className="px-4 py-2 text-foreground">
                            {LEAVE_TYPE[l.type]}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {formatDate(l.startDate)}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {formatDate(l.endDate)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge cls={LEAVE_BADGE[l.status]}>
                              {l.status[0] + l.status.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
