import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  Patient,
  Consultation,
  PatientPaymentSummary,
} from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  StatCard,
} from '../components/ui';
import { VisitHistoryList } from '../components/VisitHistoryList';
import { currency, formatDate } from '../lib/format';

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const patient = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get<Patient>(`/patients/${id}`)).data,
  });
  const history = useQuery({
    queryKey: ['patient-history', id],
    queryFn: async () =>
      (await api.get<Consultation[]>(`/consultations/patient/${id}/history`))
        .data,
  });
  const summary = useQuery({
    queryKey: ['patient-payment-summary', id],
    queryFn: async () =>
      (
        await api.get<PatientPaymentSummary>(
          `/consultations/patient/${id}/payment-summary`,
        )
      ).data,
  });

  if (patient.isLoading) return <Spinner />;
  const p = patient.data!;
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title={p.fullName}
        subtitle={`${p.patientCode} · ${p.phone}`}
        action={
          can('consultations.create') && (
            <Link
              to={`/consultations/new?patientId=${p.id}`}
              className="btn-primary"
            >
              + New Consultation
            </Link>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-3 font-semibold text-foreground">Patient Details</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Age" value={p.age?.toString() ?? '—'} />
            <Row label="Gender" value={p.gender ?? '—'} />
            <Row label="Date of Birth" value={formatDate(p.dob)} />
            <Row label="Blood Group" value={p.bloodGroup ?? '—'} />
            <Row label="Alt. Phone" value={p.altPhone ?? '—'} />
            <Row label="Emergency" value={p.emergencyContact ?? '—'} />
            <Row label="Address" value={p.address ?? '—'} />
          </dl>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Fees" value={currency(s?.totalFees ?? 0)} />
            <StatCard
              label="Total Paid"
              value={currency(s?.totalPaid ?? 0)}
              accent="text-success"
            />
            <StatCard
              label="Total Due"
              value={currency(s?.totalDue ?? 0)}
              accent={s && s.totalDue > 0 ? 'text-error' : 'text-foreground'}
            />
            <StatCard
              label="Last Payment"
              value={formatDate(s?.lastPaymentDate)}
            />
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-foreground">Visit History</h3>
            {history.isLoading ? (
              <Spinner />
            ) : (
              <VisitHistoryList visits={history.data ?? []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
