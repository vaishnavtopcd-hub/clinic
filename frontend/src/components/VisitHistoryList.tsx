import { Link } from 'react-router-dom';
import type { Consultation } from '../lib/types';
import { PaymentBadge, EmptyState } from './ui';
import { currency, formatDateTime } from '../lib/format';

/** Renders a patient's consultation history (latest first). */
export function VisitHistoryList({ visits }: { visits: Consultation[] }) {
  if (!visits.length) return <EmptyState message="No visits recorded yet" />;

  return (
    <div className="space-y-4">
      {visits.map((v) => {
        const totalMins =
          v.machineUsages?.reduce((s, m) => s + m.durationMinutes, 0) ?? 0;
        return (
          <div key={v.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  {formatDateTime(v.consultationDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {v.physiotherapist?.name ?? 'Physiotherapist'} ·{' '}
                  {v.diagnosis || 'No diagnosis'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {v.payment && <PaymentBadge status={v.payment.status} />}
                <Link
                  to={`/consultations/${v.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {v.chiefComplaint && (
                <Info label="Chief Complaint" value={v.chiefComplaint} />
              )}
              {v.treatmentPlan && (
                <Info label="Treatment Plan" value={v.treatmentPlan} />
              )}
              {v.clinicalNote?.painScale != null && (
                <Info
                  label="Pain Scale"
                  value={`${v.clinicalNote.painScale}/10`}
                />
              )}
              {v.clinicalNote?.findings && (
                <Info label="Findings" value={v.clinicalNote.findings} />
              )}
            </div>

            {!!v.machineUsages?.length && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Machines Used ({totalMins} min total)
                </p>
                <div className="flex flex-wrap gap-2">
                  {v.machineUsages.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {m.machineName} · {m.durationMinutes}m
                    </span>
                  ))}
                </div>
              </div>
            )}

            {v.payment && (
              <div className="mt-3 border-t border-border pt-2 text-sm text-muted-foreground">
                Fee: {currency(v.payment.consultationFee)} · {v.payment.method}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
