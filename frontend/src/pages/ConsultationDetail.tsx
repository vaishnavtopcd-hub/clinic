import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  Consultation,
  ClinicalNote,
  PaymentMethod,
  PaymentStatus,
} from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  PaymentBadge,
  Field,
  ErrorText,
  Modal,
} from '../components/ui';
import { currency, formatDateTime } from '../lib/format';
import { generateInvoice } from '../lib/invoice';
import {
  formatTemplateValue,
  formatFieldValue,
} from '../components/DynamicNoteFields';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { can, user } = useAuth();
  const [editPay, setEditPay] = useState(false);
  const [error, setError] = useState('');
  const [pay, setPay] = useState({
    consultationFee: '',
    method: 'CASH' as PaymentMethod,
    status: 'DUE' as PaymentStatus,
  });

  const q = useQuery({
    queryKey: ['consultation', id],
    queryFn: async () =>
      (await api.get<Consultation>(`/consultations/${id}`)).data,
  });

  const updatePay = useMutation({
    mutationFn: async () =>
      api.patch(`/consultations/${id}/payment`, {
        consultationFee: Number(pay.consultationFee),
        method: pay.method,
        status: pay.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultation', id] });
      setEditPay(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  if (q.isLoading) return <Spinner />;
  const c = q.data!;
  const totalMins =
    c.machineUsages?.reduce((s, m) => s + m.durationMinutes, 0) ?? 0;

  const openEditPay = () => {
    setPay({
      consultationFee: c.payment?.consultationFee.toString() ?? '',
      method: c.payment?.method ?? 'CASH',
      status: c.payment?.status ?? 'DUE',
    });
    setError('');
    setEditPay(true);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Consultation"
        subtitle={formatDateTime(c.consultationDate)}
        action={
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={!c.payment}
              title={c.payment ? 'Download invoice PDF' : 'No payment to invoice yet'}
              onClick={() =>
                generateInvoice(c, {
                  clinicName: c.clinic?.name ?? user?.clinic?.name,
                })
              }
            >
              Download Invoice
            </button>
            <Link to={`/patients/${c.patientId}`} className="btn-secondary">
              View Patient
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-foreground">Details</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Patient" value={c.patient?.fullName} />
            <Info label="Physiotherapist" value={c.physiotherapist?.name} />
            <Info label="Chief Complaint" value={c.chiefComplaint} />
            <Info label="Diagnosis" value={c.diagnosis} />
            <Info label="Treatment Plan" value={c.treatmentPlan} full />
            <Info label="Notes" value={c.notes} full />
          </dl>

          <h3 className="mb-3 mt-6 font-semibold text-foreground">
            Clinical Notes
          </h3>
          {c.clinicalNote ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Assessment" value={c.clinicalNote.assessment} />
              <Info label="Findings" value={c.clinicalNote.findings} />
              <Info
                label="Pain Scale"
                value={
                  c.clinicalNote.painScale != null
                    ? `${c.clinicalNote.painScale}/10`
                    : undefined
                }
              />
              <Info label="Range of Motion" value={c.clinicalNote.rangeOfMotion} />
              <Info
                label="Exercise Advice"
                value={c.clinicalNote.exerciseAdvice}
                full
              />
              <Info
                label="Therapist Notes"
                value={c.clinicalNote.therapistNotes}
                full
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No clinical notes recorded.</p>
          )}

          <TemplateSection note={c.clinicalNote} />

          <h3 className="mb-3 mt-6 font-semibold text-foreground">
            Machines Used ({totalMins} min total)
          </h3>
          {c.machineUsages?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Machine</th>
                  <th className="py-1">Duration</th>
                  <th className="py-1">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.machineUsages.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-medium text-foreground">
                      {m.machineName}
                    </td>
                    <td className="py-2 text-muted-foreground">{m.durationMinutes} min</td>
                    <td className="py-2 text-muted-foreground">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No machines used.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Payment</h3>
            {c.payment && <PaymentBadge status={c.payment.status} />}
          </div>
          {c.payment && (
            <dl className="mt-4 space-y-2 text-sm">
              <Info label="Consultation Fee" value={currency(c.payment.consultationFee)} />
              <Info label="Amount Paid" value={currency(c.payment.amountPaid)} />
              <Info
                label="Amount Due"
                value={currency(
                  c.payment.consultationFee - c.payment.amountPaid,
                )}
              />
              <Info label="Method" value={c.payment.method} />
              <Info
                label="Paid On"
                value={c.payment.paidAt ? formatDateTime(c.payment.paidAt) : '—'}
              />
            </dl>
          )}
          {can('payments.update') && user?.role !== 'SUPER_ADMIN' && (
            <button className="btn-primary mt-4 w-full" onClick={openEditPay}>
              Update Payment
            </button>
          )}
        </Card>
      </div>

      <Modal
        open={editPay}
        onClose={() => setEditPay(false)}
        title="Update Payment"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            updatePay.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Consultation Fee">
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={pay.consultationFee}
              onChange={(e) =>
                setPay({ ...pay, consultationFee: e.target.value })
              }
            />
          </Field>
          <Field label="Payment Method">
            <select
              className="input"
              value={pay.method}
              onChange={(e) =>
                setPay({ ...pay, method: e.target.value as PaymentMethod })
              }
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </Field>
          <Field label="Payment Status">
            <select
              className="input"
              value={pay.status}
              onChange={(e) =>
                setPay({ ...pay, status: e.target.value as PaymentStatus })
              }
            >
              <option value="PAID">Paid</option>
              <option value="DUE">Due</option>
            </select>
          </Field>
          <ErrorText message={error} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditPay(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={updatePay.isPending}
            >
              {updatePay.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/**
 * Renders a completed consultation's template answers from the point-in-time
 * snapshot captured at creation, so later template edits never change it.
 * Falls back to the legacy value-only snapshot for records saved before the
 * full-structure snapshot existed.
 */
function TemplateSection({ note }: { note?: ClinicalNote }) {
  if (!note) return null;

  // Preferred path: full field structure was snapshotted.
  if (note.templateSnapshot?.length) {
    const valueById = new Map(
      (note.templateValues ?? []).map((tv) => [tv.fieldId, tv.value]),
    );
    const fields = [...note.templateSnapshot].sort((a, b) => a.order - b.order);
    return (
      <>
        <h3 className="mb-3 mt-6 font-semibold text-foreground">
          {note.templateName || 'Template'}
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {fields.map((f) => (
            <Info
              key={f.id}
              label={f.label}
              value={formatFieldValue(f, valueById.get(f.id))}
              full={f.type === 'MULTI_LINE_TEXT'}
            />
          ))}
        </dl>
      </>
    );
  }

  // Legacy fallback: value-only snapshot.
  if (note.templateValues?.length) {
    return (
      <>
        <h3 className="mb-3 mt-6 font-semibold text-foreground">
          {note.templateName || 'Template'}
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {note.templateValues.map((tv) => (
            <Info
              key={tv.fieldId}
              label={tv.label}
              value={formatTemplateValue(tv.value)}
              full={tv.type === 'MULTI_LINE_TEXT'}
            />
          ))}
        </dl>
      </>
    );
  }

  return null;
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value || '—'}</dd>
    </div>
  );
}
