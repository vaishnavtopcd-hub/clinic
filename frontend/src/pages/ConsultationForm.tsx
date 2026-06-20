import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import type {
  Paginated,
  Patient,
  Machine,
  PaymentMethod,
  PaymentStatus,
} from '../lib/types';
import { PageHeader, Card, Field, ErrorText, Spinner } from '../components/ui';
import { todayISO } from '../lib/format';

interface MachineRow {
  machineId: string;
  durationMinutes: string;
  notes: string;
}

export default function ConsultationForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetPatient = params.get('patientId') ?? '';

  const [patientId, setPatientId] = useState(presetPatient);
  const [patientSearch, setPatientSearch] = useState('');
  const [date, setDate] = useState(todayISO());
  const [details, setDetails] = useState({
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    notes: '',
  });
  const [clinical, setClinical] = useState({
    assessment: '',
    findings: '',
    painScale: '',
    rangeOfMotion: '',
    exerciseAdvice: '',
    therapistNotes: '',
  });
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [payment, setPayment] = useState({
    consultationFee: '',
    method: 'CASH' as PaymentMethod,
    status: 'PAID' as PaymentStatus,
  });
  const [error, setError] = useState('');

  const patientList = useQuery({
    queryKey: ['patients-select', patientSearch],
    queryFn: async () =>
      (
        await api.get<Paginated<Patient>>('/patients', {
          params: { page: 1, limit: 20, search: patientSearch || undefined },
        })
      ).data,
  });

  const machineList = useQuery({
    queryKey: ['machines-active'],
    queryFn: async () =>
      (await api.get<Machine[]>('/machines/active')).data,
  });

  const selectedPatient = useMemo(
    () => patientList.data?.data.find((p) => p.id === patientId),
    [patientList.data, patientId],
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        patientId,
        consultationDate: date,
        ...details,
        clinicalNote: {
          assessment: clinical.assessment || undefined,
          findings: clinical.findings || undefined,
          painScale: clinical.painScale ? Number(clinical.painScale) : undefined,
          rangeOfMotion: clinical.rangeOfMotion || undefined,
          exerciseAdvice: clinical.exerciseAdvice || undefined,
          therapistNotes: clinical.therapistNotes || undefined,
        },
        machineUsages: machines
          .filter((m) => m.machineId && m.durationMinutes)
          .map((m) => ({
            machineId: m.machineId,
            durationMinutes: Number(m.durationMinutes),
            notes: m.notes || undefined,
          })),
        payment: {
          consultationFee: Number(payment.consultationFee || 0),
          method: payment.method,
          status: payment.status,
        },
      };
      return (await api.post('/consultations', payload)).data;
    },
    onSuccess: (data: any) => navigate(`/consultations/${data.id}`),
    onError: (e) => setError(apiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId) {
      setError('Please select a patient');
      return;
    }
    save.mutate();
  };

  const addMachine = () =>
    setMachines((m) => [...m, { machineId: '', durationMinutes: '', notes: '' }]);
  const updateMachine = (i: number, k: keyof MachineRow, v: string) =>
    setMachines((m) => m.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const removeMachine = (i: number) =>
    setMachines((m) => m.filter((_, idx) => idx !== i));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New Consultation" subtitle="Record a patient visit" />
      <form onSubmit={submit} className="space-y-5">
        {/* Step 1: Patient */}
        <Card>
          <SectionTitle n={1} title="Patient" />
          {presetPatient && selectedPatient ? (
            <div className="rounded-lg bg-primary/10 px-4 py-3">
              <p className="font-medium text-primary">
                {selectedPatient.fullName}
              </p>
              <p className="text-sm text-primary">
                {selectedPatient.patientCode} · {selectedPatient.phone}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Search patient">
                <input
                  className="input"
                  placeholder="Name or phone…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </Field>
              <Field label="Select patient" required>
                <select
                  className="input"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {patientList.data?.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode}) · {p.phone}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </Card>

        {/* Step 2/3: Consultation details */}
        <Card>
          <SectionTitle n={2} title="Consultation Details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Consultation Date">
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Chief Complaint">
              <input
                className="input"
                value={details.chiefComplaint}
                onChange={(e) =>
                  setDetails({ ...details, chiefComplaint: e.target.value })
                }
              />
            </Field>
            <Field label="Diagnosis">
              <input
                className="input"
                value={details.diagnosis}
                onChange={(e) =>
                  setDetails({ ...details, diagnosis: e.target.value })
                }
              />
            </Field>
            <Field label="Treatment Plan">
              <input
                className="input"
                value={details.treatmentPlan}
                onChange={(e) =>
                  setDetails({ ...details, treatmentPlan: e.target.value })
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="General Notes">
                <textarea
                  className="input"
                  rows={2}
                  value={details.notes}
                  onChange={(e) =>
                    setDetails({ ...details, notes: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Clinical notes */}
        <Card>
          <SectionTitle n={3} title="Clinical Notes" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assessment">
              <textarea
                className="input"
                rows={2}
                value={clinical.assessment}
                onChange={(e) =>
                  setClinical({ ...clinical, assessment: e.target.value })
                }
              />
            </Field>
            <Field label="Findings">
              <textarea
                className="input"
                rows={2}
                value={clinical.findings}
                onChange={(e) =>
                  setClinical({ ...clinical, findings: e.target.value })
                }
              />
            </Field>
            <Field label="Pain Scale (0-10)">
              <input
                type="number"
                min={0}
                max={10}
                className="input"
                value={clinical.painScale}
                onChange={(e) =>
                  setClinical({ ...clinical, painScale: e.target.value })
                }
              />
            </Field>
            <Field label="Range of Motion (ROM)">
              <input
                className="input"
                value={clinical.rangeOfMotion}
                onChange={(e) =>
                  setClinical({ ...clinical, rangeOfMotion: e.target.value })
                }
              />
            </Field>
            <Field label="Exercise Advice">
              <textarea
                className="input"
                rows={2}
                value={clinical.exerciseAdvice}
                onChange={(e) =>
                  setClinical({ ...clinical, exerciseAdvice: e.target.value })
                }
              />
            </Field>
            <Field label="Therapist Notes">
              <textarea
                className="input"
                rows={2}
                value={clinical.therapistNotes}
                onChange={(e) =>
                  setClinical({ ...clinical, therapistNotes: e.target.value })
                }
              />
            </Field>
          </div>
        </Card>

        {/* Machines */}
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle n={4} title="Machine Usage" />
            <button type="button" className="btn-secondary" onClick={addMachine}>
              + Add Machine
            </button>
          </div>
          {machines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No machines added.</p>
          ) : (
            <div className="space-y-3">
              {machines.map((row, i) => (
                <div
                  key={i}
                  className="grid items-end gap-3 sm:grid-cols-[1fr_120px_1fr_auto]"
                >
                  <Field label="Machine">
                    <select
                      className="input"
                      value={row.machineId}
                      onChange={(e) =>
                        updateMachine(i, 'machineId', e.target.value)
                      }
                    >
                      <option value="">Select…</option>
                      {machineList.data?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minutes">
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={row.durationMinutes}
                      onChange={(e) =>
                        updateMachine(i, 'durationMinutes', e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Notes">
                    <input
                      className="input"
                      value={row.notes}
                      onChange={(e) => updateMachine(i, 'notes', e.target.value)}
                    />
                  </Field>
                  <button
                    type="button"
                    className="btn-danger mb-0.5"
                    onClick={() => removeMachine(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment */}
        <Card>
          <SectionTitle n={5} title="Payment" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Consultation Fee" required>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={payment.consultationFee}
                onChange={(e) =>
                  setPayment({ ...payment, consultationFee: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Payment Method">
              <select
                className="input"
                value={payment.method}
                onChange={(e) =>
                  setPayment({ ...payment, method: e.target.value as PaymentMethod })
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
                value={payment.status}
                onChange={(e) =>
                  setPayment({ ...payment, status: e.target.value as PaymentStatus })
                }
              >
                <option value="PAID">Paid</option>
                <option value="DUE">Due</option>
              </select>
            </Field>
          </div>
          {payment.status === 'DUE' && (
            <p className="mt-2 text-sm text-error">
              This consultation will be saved with a pending (Due) payment.
            </p>
          )}
        </Card>

        <ErrorText message={error} />
        <div className="flex justify-end gap-2 pb-8">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Consultation'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
        {n}
      </span>
      {title}
    </h3>
  );
}
