import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type {
  HrSummary,
  Clinic,
  Paginated,
  AttendanceStatus,
  LeaveStatus,
  EmploymentType,
} from '../../lib/types';
import {
  PageHeader,
  Card,
  StatCard,
  Spinner,
  EmptyState,
} from '../../components/ui';
import { ExportMenu } from '../../components/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { currency, todayISO } from '../../lib/format';

interface HrReportRow {
  section: string;
  item: string;
  value: string | number;
}

const HR_EXPORT_COLUMNS: ExportColumn<HrReportRow>[] = [
  { header: 'Section', value: (r) => r.section },
  { header: 'Item', value: (r) => r.item },
  { header: 'Value', value: (r) => r.value },
];

/** Flatten the HR summary into export rows (section / item / value). */
function flattenHrSummary(d: HrSummary): HrReportRow[] {
  const rows: HrReportRow[] = [
    { section: 'Staff', item: 'Total', value: d.employees.total },
    { section: 'Staff', item: 'Active', value: d.employees.active },
    { section: 'Staff', item: 'Inactive', value: d.employees.inactive },
  ];
  d.employees.byType.forEach((t) =>
    rows.push({ section: 'Staff by Type', item: t.type, value: t.count }),
  );
  d.attendance.byStatus.forEach((a) =>
    rows.push({ section: 'Attendance', item: a.status, value: a.count }),
  );
  rows.push({ section: 'Attendance', item: 'Total', value: d.attendance.total });
  d.leave.byStatus.forEach((l) =>
    rows.push({ section: 'Leave', item: l.status, value: l.count }),
  );
  rows.push(
    { section: 'Payroll', item: 'Paid (count)', value: d.payroll.paidCount },
    { section: 'Payroll', item: 'Paid (amount)', value: currency(d.payroll.paidAmount) },
    { section: 'Payroll', item: 'Unpaid (count)', value: d.payroll.unpaidCount },
    { section: 'Payroll', item: 'Unpaid (amount)', value: currency(d.payroll.unpaidAmount) },
    { section: 'Payroll', item: 'Total (amount)', value: currency(d.payroll.totalAmount) },
  );
  return rows;
}

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
};

const LEAVE_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
};

export default function HrReports() {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clinicId, setClinicId] = useState('');

  const clinics = useQuery({
    queryKey: ['clinics-filter'],
    enabled: isSuper,
    queryFn: async () =>
      (
        await api.get<Paginated<Clinic>>('/clinics', {
          params: { limit: 100 },
        })
      ).data,
  });

  const summary = useQuery({
    queryKey: ['hr-summary', from, to, month, clinicId],
    queryFn: async () =>
      (
        await api.get<HrSummary>('/hr/reports/summary', {
          params: {
            dateFrom: from || undefined,
            dateTo: to || undefined,
            month: month || undefined,
            clinicId: clinicId || undefined,
          },
        })
      ).data,
  });

  return (
    <div>
      <PageHeader
        title="HR Reports"
        subtitle="Workforce, attendance, leave and payroll overview"
        action={
          summary.data && (
            <ExportMenu
              filename="hr-report"
              title="HR Report"
              columns={HR_EXPORT_COLUMNS}
              fetchRows={() => flattenHrSummary(summary.data!)}
            />
          )
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Month</label>
            <input
              type="month"
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          {isSuper && (
            <div>
              <label className="label">Clinic</label>
              <select
                className="input"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              >
                <option value="">All clinics</option>
                {clinics.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {summary.isLoading ? (
        <Spinner />
      ) : !summary.data ? (
        <EmptyState message="No data" />
      ) : (
        <HrReportBody data={summary.data} />
      )}
    </div>
  );
}

function HrReportBody({ data }: { data: HrSummary }) {
  const { employees, attendance, leave, payroll } = data;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Staff" value={employees.total} />
        <StatCard
          label="Active"
          value={employees.active}
          accent="text-success"
        />
        <StatCard
          label="Inactive"
          value={employees.inactive}
          accent="text-muted-foreground"
        />
        <StatCard
          label="Pending Leaves"
          value={leave.pending}
          accent="text-warning"
        />
        <StatCard
          label="Payroll Paid"
          value={currency(payroll.paidAmount)}
          accent="text-success"
          hint={`${payroll.paidCount} paid`}
        />
        <StatCard
          label="Payroll Unpaid"
          value={currency(payroll.unpaidAmount)}
          accent="text-error"
          hint={`${payroll.unpaidCount} unpaid`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-foreground">
            Staff by Employment Type
          </h3>
          <ReportTable cols={['Type', 'Count']}>
            {employees.byType.length === 0 ? (
              <NoDataRow span={2} />
            ) : (
              employees.byType.map((d) => (
                <tr key={d.type}>
                  <td className="px-4 py-3 font-medium">
                    {TYPE_LABELS[d.type] ?? d.type}
                  </td>
                  <td className="px-4 py-3">{d.count}</td>
                </tr>
              ))
            )}
          </ReportTable>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-foreground">
            Attendance (selected range)
          </h3>
          <ReportTable cols={['Status', 'Count']}>
            {attendance.byStatus.length === 0 ? (
              <NoDataRow span={2} />
            ) : (
              <>
                {attendance.byStatus.map((a) => (
                  <tr key={a.status}>
                    <td className="px-4 py-3 font-medium">
                      {ATTENDANCE_LABELS[a.status] ?? a.status}
                    </td>
                    <td className="px-4 py-3">{a.count}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3">{attendance.total}</td>
                </tr>
              </>
            )}
          </ReportTable>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-foreground">Leave Requests</h3>
          <ReportTable cols={['Status', 'Count']}>
            {leave.byStatus.length === 0 ? (
              <NoDataRow span={2} />
            ) : (
              leave.byStatus.map((l) => (
                <tr key={l.status}>
                  <td className="px-4 py-3 font-medium">
                    {LEAVE_LABELS[l.status] ?? l.status}
                  </td>
                  <td className="px-4 py-3">{l.count}</td>
                </tr>
              ))
            )}
          </ReportTable>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-foreground">
            Payroll (month)
          </h3>
          <ReportTable cols={['Type', 'Count', 'Amount']}>
            <tr>
              <td className="px-4 py-3 font-medium">Paid</td>
              <td className="px-4 py-3">{payroll.paidCount}</td>
              <td className="px-4 py-3 text-success">
                {currency(payroll.paidAmount)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">Unpaid</td>
              <td className="px-4 py-3">{payroll.unpaidCount}</td>
              <td className="px-4 py-3 text-error">
                {currency(payroll.unpaidAmount)}
              </td>
            </tr>
            <tr className="bg-muted/40 font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">
                {payroll.paidCount + payroll.unpaidCount}
              </td>
              <td className="px-4 py-3">{currency(payroll.totalAmount)}</td>
            </tr>
          </ReportTable>
        </Card>
      </div>
    </>
  );
}

function ReportTable({
  cols,
  children,
}: {
  cols: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function NoDataRow({ span }: { span: number }) {
  return (
    <tr>
      <td
        colSpan={span}
        className="px-4 py-8 text-center text-muted-foreground"
      >
        No data
      </td>
    </tr>
  );
}
