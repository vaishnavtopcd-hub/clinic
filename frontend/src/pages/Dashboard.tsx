import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type {
  DashboardSummary,
  PaymentDashboard,
  DashboardTrendPoint,
} from '../lib/types';
import {
  PageHeader,
  StatCard,
  Card,
  Spinner,
  PaymentBadge,
  EmptyState,
} from '../components/ui';
import { RevenuePatientsChart } from '../components/RevenuePatientsChart';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { currency, formatDate, formatDateTime } from '../lib/format';
import {
  DATE_PRESETS,
  presetRange,
  periodLabel,
  type DatePreset,
} from '../lib/dateRange';

export default function Dashboard() {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [dateFrom, setDateFrom] = useState(presetRange('today').from);
  const [dateTo, setDateTo] = useState(presetRange('today').to);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const { from, to } = presetRange(p);
      setDateFrom(from);
      setDateTo(to);
    }
  };
  const period = periodLabel(preset);

  const summary = useQuery({
    queryKey: ['dashboard-summary', dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<DashboardSummary>('/dashboard/summary', {
          params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
  const payments = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: async () =>
      (await api.get<PaymentDashboard>('/dashboard/payments')).data,
  });
  const trends = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () =>
      (await api.get<DashboardTrendPoint[]>('/dashboard/trends')).data,
  });

  if (summary.isLoading) return <Spinner />;
  const s = summary.data;
  const p = payments.data;
  const t = trends.data;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Clinic overview" />

      {/* Period filter — period metrics below update to the selected range. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map((p) => (
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
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`${period} Patients`} value={s?.todaysPatients ?? 0} />
        <StatCard
          label={`${period} Consultations`}
          value={s?.todaysConsultations ?? 0}
        />
        <StatCard label="Total Patients" value={s?.totalPatients ?? 0} />
        <StatCard label="Active Physiotherapists" value={s?.activePhysiotherapists ?? 0} />
        <StatCard
          label={`${period} Revenue`}
          value={currency(s?.todaysRevenue ?? 0)}
          accent="text-success"
        />
        <StatCard
          label="Outstanding Due"
          value={currency(s?.outstandingDue ?? 0)}
          accent="text-error"
        />
        <StatCard
          label="Total Revenue"
          value={currency(p?.totalRevenue ?? 0)}
          accent="text-success"
        />
        <StatCard
          label="Pending Payments"
          value={p?.pendingPayments ?? 0}
          accent="text-error"
          hint={`${currency(p?.totalDue ?? 0)} due`}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Revenue &amp; Patients</h3>
          <span className="text-xs text-muted-foreground">Last 6 months</span>
        </div>
        {trends.isLoading ? (
          <Spinner />
        ) : t && t.length ? (
          <RevenuePatientsChart data={t} />
        ) : (
          <EmptyState message="No trend data yet" />
        )}
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-foreground">Recent Patients</h3>
          {s?.recentPatients?.length ? (
            <ul className="divide-y divide-border">
              {s.recentPatients.map((pt) => (
                <li key={pt.id} className="flex items-center justify-between py-2.5">
                  <Link
                    to={`/patients/${pt.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {pt.fullName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {pt.patientCode} · {formatDate(pt.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No patients yet" />
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-foreground">Recent Consultations</h3>
          {s?.recentConsultations?.length ? (
            <ul className="divide-y divide-border">
              {s.recentConsultations.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link
                      to={`/consultations/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.patient?.fullName ?? 'Patient'}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.diagnosis || 'No diagnosis'} · {formatDateTime(c.consultationDate)}
                    </p>
                  </div>
                  {c.payment && <PaymentBadge status={c.payment.status} />}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No consultations yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
