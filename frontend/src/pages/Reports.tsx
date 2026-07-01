import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fetchAllPaginated } from '../lib/api';
import { PageHeader, Card, Spinner, EmptyState, Pagination } from '../components/ui';
import { ExportMenu } from '../components/ExportMenu';
import type { ExportColumn } from '../lib/export';
import { currency } from '../lib/format';
import {
  DATE_PRESETS_WITH_ALL,
  presetRange,
  type DatePreset,
} from '../lib/dateRange';

const REPORTS = [
  { key: 'daily-collection', label: 'Collection' },
  { key: 'machine-usage', label: 'Machine Usage' },
] as const;

type ReportKey = (typeof REPORTS)[number]['key'];

/** Columns for exporting each report type. */
function reportColumns(tab: ReportKey): ExportColumn<any>[] {
  switch (tab) {
    case 'daily-collection':
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
    default:
      return [];
  }
}

export default function Reports() {
  const [tab, setTab] = useState<ReportKey>('daily-collection');
  const [preset, setPreset] = useState<DatePreset>('today');
  const [from, setFrom] = useState(presetRange('today').from);
  const [to, setTo] = useState(presetRange('today').to);
  const [page, setPage] = useState(1);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    setPage(1);
    if (p !== 'custom') {
      const r = presetRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const report = useQuery({
    queryKey: ['report', tab, from, to, page],
    queryFn: async () =>
      (
        await api.get(`/reports/${tab}`, {
          params: {
            dateFrom: from || undefined,
            dateTo: to || undefined,
            page,
            limit: 10,
          },
        })
      ).data,
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Collection and machine usage"
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
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS_WITH_ALL.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                preset === p.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">From</label>
                <input
                  type="date"
                  className="input"
                  value={from}
                  max={to || undefined}
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
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="!p-0 overflow-x-auto">
        {report.isLoading ? (
          <Spinner />
        ) : (
          <>
            <ReportTable tab={tab} data={report.data} />
            {/* totalPages is only present on the paginated collection report;
                the machine-usage aggregate omits it, so Pagination renders nothing. */}
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

  if (tab === 'daily-collection') {
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

  // machine-usage
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

function EmptyRow({ span }: { span: number }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-10 text-center text-muted-foreground">
        No records for the selected range
      </td>
    </tr>
  );
}
