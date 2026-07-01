import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import type {
  Paginated,
  Patient,
  Machine,
  PaymentMethod,
  PaymentStatus,
  NoteTemplate,
} from '../lib/types';
import { PageHeader, Card, Field, ErrorText, Spinner } from '../components/ui';
import {
  DynamicNoteFields,
  buildTemplateSnapshot,
} from '../components/DynamicNoteFields';
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

  const [selected, setSelected] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [debounced, setDebounced] = useState('');
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
  // Dynamic clinical-note template (optional).
  const [templateId, setTemplateId] = useState('');
  const [templateValues, setTemplateValues] = useState<Record<string, unknown>>(
    {},
  );
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [payment, setPayment] = useState({
    consultationFee: '',
    method: 'CASH' as PaymentMethod,
    status: 'PAID' as PaymentStatus,
  });
  const [error, setError] = useState('');

  // Debounce so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(patientSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [patientSearch]);
  useEffect(() => setHighlight(0), [debounced]);

  const patientList = useQuery({
    queryKey: ['patients-select', debounced],
    enabled: debounced.length >= 1,
    queryFn: async () =>
      (
        await api.get<Paginated<Patient>>('/patients', {
          params: { page: 1, limit: 8, search: debounced },
        })
      ).data,
  });
  const results = patientList.data?.data ?? [];

  const machineList = useQuery({
    // Faulty machines (with an open complaint) are excluded from consultations.
    queryKey: ['machines-active', 'for-consultation'],
    queryFn: async () =>
      (
        await api.get<Machine[]>('/machines/active', {
          params: { excludeComplained: true },
        })
      ).data,
  });

  // Active note templates the physio can choose from.
  const templateList = useQuery({
    queryKey: ['note-templates-active'],
    queryFn: async () =>
      (await api.get<NoteTemplate[]>('/note-templates/active')).data,
  });
  const activeTemplate =
    templateList.data?.find((t) => t.id === templateId) ?? null;

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const t = templateList.data?.find((x) => x.id === id);
    // Seed values with each field's default.
    const defaults: Record<string, unknown> = {};
    t?.fields.forEach((f) => {
      if (f.defaultValue !== undefined && f.defaultValue !== null)
        defaults[f.id] = f.defaultValue;
    });
    setTemplateValues(defaults);
  };

  // When opened from a patient's page (?patientId=…), preload that patient.
  const presetQuery = useQuery({
    queryKey: ['patient', presetPatient],
    enabled: !!presetPatient,
    queryFn: async () =>
      (await api.get<Patient>(`/patients/${presetPatient}`)).data,
  });
  useEffect(() => {
    if (presetQuery.data) setSelected(presetQuery.data);
  }, [presetQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        patientId: selected!.id,
        consultationDate: date,
        ...details,
        clinicalNote: {
          assessment: clinical.assessment || undefined,
          findings: clinical.findings || undefined,
          painScale: clinical.painScale ? Number(clinical.painScale) : undefined,
          rangeOfMotion: clinical.rangeOfMotion || undefined,
          exerciseAdvice: clinical.exerciseAdvice || undefined,
          therapistNotes: clinical.therapistNotes || undefined,
          ...(activeTemplate && {
            templateId: activeTemplate.id,
            templateName: activeTemplate.name,
            templateVersion: activeTemplate.version,
            // Freeze the exact structure used, so later edits to this template
            // never change this record.
            templateSnapshot: activeTemplate.fields,
            templateValues: buildTemplateSnapshot(
              activeTemplate.fields,
              templateValues,
            ),
          }),
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

  const choosePatient = (p: Patient) => {
    setSelected(p);
    setPatientSearch('');
    setSearchOpen(false);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchOpen || debounced.length < 1) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the form while picking
      const p = results[highlight];
      if (p) choosePatient(p);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selected) {
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
          {selected ? (
            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
              <div>
                <p className="font-medium text-primary">{selected.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.patientCode} · {selected.phone}
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => {
                  setSelected(null);
                  setPatientSearch('');
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <label className="label">
                Search patient <span className="text-error">*</span>
              </label>
              <input
                className="input"
                placeholder="Search by name, phone or patient ID…"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={onSearchKeyDown}
                autoFocus
                role="combobox"
                aria-expanded={searchOpen && debounced.length >= 1}
                aria-autocomplete="list"
              />
              {!debounced && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Type a name, phone or patient ID to search.
                </p>
              )}
              {searchOpen && debounced.length >= 1 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  {patientList.isFetching ? (
                    <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                  ) : !results.length ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      No patients match “{debounced}”
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto">
                      {results.map((p, i) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => choosePatient(p)}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                              i === highlight ? 'bg-muted' : 'hover:bg-muted'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">
                                {p.fullName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {p.phone}
                                {p.age
                                  ? ` · ${p.age}${
                                      p.gender ? ' / ' + p.gender[0] : ''
                                    }`
                                  : ''}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                              {p.patientCode}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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

          {/* Optional dynamic template chosen by the physio */}
          {templateList.data && templateList.data.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
              <Field label="Use a Note Template (optional)">
                <select
                  className="input"
                  value={templateId}
                  onChange={(e) => chooseTemplate(e.target.value)}
                >
                  <option value="">No template — use standard fields</option>
                  {templateList.data.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              {activeTemplate && (
                <div className="mt-4">
                  {activeTemplate.description && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {activeTemplate.description}
                    </p>
                  )}
                  {activeTemplate.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This template has no fields.
                    </p>
                  ) : (
                    <DynamicNoteFields
                      fields={activeTemplate.fields}
                      values={templateValues}
                      onChange={(fieldId, value) =>
                        setTemplateValues((prev) => ({
                          ...prev,
                          [fieldId]: value,
                        }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )}

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
