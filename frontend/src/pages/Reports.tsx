import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fetchAllPaginated } from '../lib/api';
import { PageHeader, Card, Spinner, EmptyState, Pagination } from '../components/ui';
import { ExportMenu } from '../components/ExportMenu';
import type { ExportColumn } from '../lib/export';
import { currency, formatDate, formatDateTime, todayISO } from '../lib/format';

const REPORTS = [
  { key: 'daily-patients', label: 'Daily Patients' },
  { key: 'daily-consultations', label: 'Daily Consultations' },
  { key: 'daily-collection', label: 'Daily Collection' },
  { key: 'pending-payments', label: 'Pending Payments' },
  { key: 'machine-usage', label: 'Machine Usage' },
  { key: 'physiotherapist-activity', label: 'Physiotherapist Activity' },
] as const;

type ReportKey = (typeof REPORTS)[number]['key'];

/** Columns for exporting each report type. */
function reportColumns(tab: ReportKey): ExportColumn<any>[] {
  switch (tab) {
    case 'daily-patients':
      return [
        { header: 'Patient ID', value: (p) => p.patientCode },
        { header: 'Name', value: (p) => p.fullName },
        { header: 'Phone', value: (p) => p.phone },
        { header: 'Registered', value: (p) => formatDate(p.createdAt) },
      ];
    case 'daily-consultations':
      return [
        { header: 'Date', value: (c) => formatDateTime(c.consultationDate) },
        { header: 'Patient', value: (c) => c.patient?.fullName ?? '' },
        { header: 'Physiotherapist', value: (c) => c.physiotherapist?.name ?? '' },
        { header: 'Diagnosis', value: (c) => c.diagnosis ?? '' },
        { header: 'Payment', value: (c) => c.payment?.status ?? '' },
      ];
    case 'daily-collection':
    case 'pending-payments':
      return [
        { header: 'Patient', value: (p) => p.patient?.fullName ?? '' },
        { header: 'Fee', value: (p) => p.consultationFee },
        { header: 'Paid', value: (p) => p.amountPaid },
        { header: 'Due', value: (p) => p.consultationFee - p.amountPaid },
        { header: 'Method', value: (p) => p.method },
        { header: 'Status', value: (p) => p.status },
      ];
    case 'machine-usage':
      return [
        { header: 'Machine', value: (r) => r.machineName },
        { header: 'Times Used', value: (r) => r.uses },
        { header: 'Total Minutes', value: (r) => r.totalMinutes },
      ];
    case 'physiotherapist-activity':
      return [
        { header: 'Physiotherapist', value: (r) => r.name },
        { header: 'Patients', value: (r) => r.patients },
        { header: 'Consultations', value: (r) => r.consultations },
        { header: 'Collected', value: (r) => r.collected },
      ];
    default:
      return [];
  }
}

export default function Reports() {
  const [tab, setTab] = useState<ReportKey>('daily-patients');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [page, setPage] = useState(1);

  const report = useQuery({
    queryKey: ['report', tab, from, to, page],
    queryFn: async () =>
      (
        await api.get(`/reports/${tab}`, {
          params: { dateFrom: from, dateTo: to, page, limit: 10 },
        })
      ).data,
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Operational and financial reports"
        action={
          <ExportMenu
            filename={`report-${tab}`}
            title={REPORTS.find((r) => r.key === tab)?.label ?? 'Report'}
            columns={reportColumns(tab)}
            fetchRows={() =>
              fetchAllPaginated<any>(`/reports/${tab}`, {
                dateFrom: from,
                dateTo: to,
              })
            }
          />
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => {
              setTab(r.key);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === r.key
                ? 'bg-brand-600 text-white'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            className="btn-secondary"
            onClick={() => report.refetch()}
          >
            Apply
          </button>
        </div>
      </Card>

      {tab === 'physiotherapist-activity' && !report.isLoading && (
        <PhysioPatientsChart rows={report.data?.data ?? []} />
      )}

      <Card className="!p-0 overflow-x-auto">
        {report.isLoading ? (
          <Spinner />
        ) : (
          <>
            <ReportTable tab={tab} data={report.data} />
            {/* totalPages is only present on the paginated list reports;
                aggregate reports omit it, so Pagination renders nothing. */}
            <Pagination
              page={page}
              totalPages={report.data?.totalPages ?? 1}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function ReportTable({ tab, data }: { tab: ReportKey; data: any }) {
  if (!data) return <EmptyState message="No data" />;

  const Header = ({ cols }: { cols: string[] }) => (
    <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
      <tr>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  if (tab === 'daily-patients') {
    const rows = data.data ?? [];
    return (
      <table className="w-full text-sm">
        <caption className="px-4 py-2 text-left text-muted-foreground">
          Total: {data.count}
        </caption>
        <Header cols={['Patient ID', 'Name', 'Phone', 'Registered']} />
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <EmptyRow span={4} />}
          {rows.map((p: any) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-mono text-xs">{p.patientCode}</td>
              <td className="px-4 py-3">{p.fullName}</td>
              <td className="px-4 py-3">{p.phone}</td>
              <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (tab === 'daily-consultations') {
    const rows = data.data ?? [];
    return (
      <table className="w-full text-sm">
        <caption className="px-4 py-2 text-left text-muted-foreground">
          Total: {data.count}
        </caption>
        <Header cols={['Date', 'Patient', 'Physiotherapist', 'Diagnosis', 'Payment']} />
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <EmptyRow span={5} />}
          {rows.map((c: any) => (
            <tr key={c.id}>
              <td className="px-4 py-3">{formatDateTime(c.consultationDate)}</td>
              <td className="px-4 py-3">{c.patient?.fullName}</td>
              <td className="px-4 py-3">{c.physiotherapist?.name}</td>
              <td className="px-4 py-3">{c.diagnosis || '—'}</td>
              <td className="px-4 py-3">{c.payment?.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (tab === 'daily-collection' || tab === 'pending-payments') {
    const rows = data.data ?? [];
    return (
      <table className="w-full text-sm">
        <caption className="px-4 py-2 text-left text-muted-foreground">
          {data.count} records · Total {currency(data.total ?? 0)}
        </caption>
        <Header cols={['Patient', 'Fee', 'Paid', 'Due', 'Method', 'Status']} />
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <EmptyRow span={6} />}
          {rows.map((p: any) => (
            <tr key={p.id}>
              <td className="px-4 py-3">{p.patient?.fullName}</td>
              <td className="px-4 py-3">{currency(p.consultationFee)}</td>
              <td className="px-4 py-3">{currency(p.amountPaid)}</td>
              <td className="px-4 py-3 text-error">
                {currency(p.consultationFee - p.amountPaid)}
              </td>
              <td className="px-4 py-3">{p.method}</td>
              <td className="px-4 py-3">{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (tab === 'machine-usage') {
    const rows = data.data ?? [];
    return (
      <table className="w-full text-sm">
        <Header cols={['Machine', 'Times Used', 'Total Minutes']} />
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <EmptyRow span={3} />}
          {rows.map((r: any) => (
            <tr key={r.machineName}>
              <td className="px-4 py-3 font-medium">{r.machineName}</td>
              <td className="px-4 py-3">{r.uses}</td>
              <td className="px-4 py-3">{r.totalMinutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // physiotherapist-activity
  const rows = data.data ?? [];
  return (
    <table className="w-full text-sm">
      <Header cols={['Physiotherapist', 'Patients', 'Consultations', 'Collected']} />
      <tbody className="divide-y divide-border">
        {rows.length === 0 && <EmptyRow span={4} />}
        {rows.map((r: any) => (
          <tr key={r.physiotherapistId}>
            <td className="px-4 py-3 font-medium">{r.name}</td>
            <td className="px-4 py-3">{r.patients}</td>
            <td className="px-4 py-3">{r.consultations}</td>
            <td className="px-4 py-3 text-success">{currency(r.collected)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Horizontal bar chart of patients handled per physiotherapist. */
function PhysioPatientsChart({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.patients - a.patients);
  const max = Math.max(...sorted.map((r) => r.patients), 1);

  return (
    <Card className="mb-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Patients per Physiotherapist
      </h3>
      <div className="space-y-3">
        {sorted.map((r) => (
          <div key={r.physiotherapistId} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-sm text-muted-foreground" title={r.name}>
              {r.name}
            </div>
            <div className="flex-1">
              <div className="h-6 rounded bg-muted">
                <div
                  className="flex h-6 items-center justify-end rounded bg-brand-600 px-2 text-xs font-medium text-white transition-all"
                  style={{ width: `${Math.max((r.patients / max) * 100, 6)}%` }}
                >
                  {r.patients}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyRow({ span }: { span: number }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-10 text-center text-muted-foreground">
        No records for the selected range
      </td>
    </tr>
  );
}
