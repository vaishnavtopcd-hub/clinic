import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError, fetchAllPaginated } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  Paginated,
  Machine,
  MachineComplaint,
  ComplaintStatus,
  ComplaintSeverity,
} from '../lib/types';
import { COMPLAINT_STATUS_LABELS } from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Pagination,
  Modal,
  Field,
  ErrorText,
} from '../components/ui';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportMenu } from '../components/ExportMenu';
import type { ExportColumn } from '../lib/export';
import { formatDate } from '../lib/format';

const STATUS_BADGE: Record<ComplaintStatus, string> = {
  OPEN: 'bg-error/15 text-error',
  UNDER_INSPECTION: 'bg-warning/15 text-warning',
  RESOLVED: 'bg-success/15 text-success',
  REJECTED: 'bg-muted text-muted-foreground',
};

const SEVERITY_BADGE: Record<ComplaintSeverity, string> = {
  LOW: 'bg-info/15 text-info',
  MEDIUM: 'bg-warning/15 text-warning',
  HIGH: 'bg-error/15 text-error',
};

const EXPORT_COLUMNS: ExportColumn<MachineComplaint>[] = [
  { header: 'Machine', value: (c) => c.machineName },
  { header: 'Issue', value: (c) => c.title },
  { header: 'Severity', value: (c) => c.severity },
  { header: 'Status', value: (c) => COMPLAINT_STATUS_LABELS[c.status] },
  { header: 'Reported By', value: (c) => c.reportedBy?.name ?? '' },
  { header: 'Inspected By', value: (c) => c.inspectedBy?.name ?? '' },
  { header: 'Resolution', value: (c) => c.resolution ?? '' },
  { header: 'Reported On', value: (c) => formatDate(c.createdAt) },
];

const emptyCreate = {
  machineId: '',
  title: '',
  description: '',
  severity: 'MEDIUM' as ComplaintSeverity,
};

export default function MachineComplaints() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can('machine-complaints.manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreate });
  const [createError, setCreateError] = useState('');

  const [manage, setManage] = useState<MachineComplaint | null>(null);
  const [manageForm, setManageForm] = useState({
    status: 'OPEN' as ComplaintStatus,
    severity: 'MEDIUM' as ComplaintSeverity,
    inspectionNotes: '',
    resolution: '',
  });
  const [manageError, setManageError] = useState('');

  const list = useQuery({
    queryKey: ['machine-complaints', page, search, status, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<MachineComplaint>>('/machine-complaints', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            status: status || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  // Active machines for the report dropdown (clinic + global).
  const machines = useQuery({
    queryKey: ['machines-active'],
    enabled: createOpen,
    queryFn: async () =>
      (await api.get<Machine[]>('/machines/active')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/machine-complaints', {
        machineId: createForm.machineId,
        title: createForm.title,
        description: createForm.description,
        severity: createForm.severity,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine-complaints'] });
      setCreateOpen(false);
    },
    onError: (e) => setCreateError(apiError(e)),
  });

  const save = useMutation({
    mutationFn: async () =>
      api.patch(`/machine-complaints/${manage!.id}`, {
        status: manageForm.status,
        severity: manageForm.severity,
        inspectionNotes: manageForm.inspectionNotes || undefined,
        resolution: manageForm.resolution || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine-complaints'] });
      setManage(null);
    },
    onError: (e) => setManageError(apiError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/machine-complaints/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machine-complaints'] }),
    onError: (e) => window.alert(apiError(e)),
  });

  const openCreate = () => {
    setCreateForm({ ...emptyCreate });
    setCreateError('');
    setCreateOpen(true);
  };

  const openManage = (c: MachineComplaint) => {
    setManage(c);
    setManageForm({
      status: c.status,
      severity: c.severity,
      inspectionNotes: c.inspectionNotes ?? '',
      resolution: c.resolution ?? '',
    });
    setManageError('');
  };

  return (
    <div>
      <PageHeader
        title="Machine Complaints"
        subtitle="Report machine faults and track inspection to resolution"
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Report Complaint
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <input
            className="input max-w-xs"
            placeholder="Search machine / issue…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[180px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ComplaintStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {(
              ['OPEN', 'UNDER_INSPECTION', 'RESOLVED', 'REJECTED'] as ComplaintStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {COMPLAINT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
              setPage(1);
            }}
          />
          <div className="ml-auto">
            <ExportMenu
              filename="machine-complaints"
              title="Machine Complaints"
              columns={EXPORT_COLUMNS}
              fetchRows={() =>
                fetchAllPaginated<MachineComplaint>('/machine-complaints', {
                  search: search || undefined,
                  status: status || undefined,
                  dateFrom: dateFrom || undefined,
                  dateTo: dateTo || undefined,
                })
              }
            />
          </div>
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message="No complaints found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Machine</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reported By</th>
                  <th className="px-4 py-3">Reported On</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.machineName}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{c.title}</p>
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[c.severity]}`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[c.status]}`}
                      >
                        {COMPLAINT_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.reportedBy?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => openManage(c)}
                        >
                          Manage
                        </button>
                        <button
                          className="ml-3 text-error hover:underline"
                          onClick={() => {
                            if (window.confirm(`Delete complaint "${c.title}"?`))
                              del.mutate(c.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={list.data.totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Report complaint */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Report Machine Complaint"
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCreateError('');
            create.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Machine" required>
            <select
              className="input"
              value={createForm.machineId}
              onChange={(e) =>
                setCreateForm({ ...createForm, machineId: e.target.value })
              }
              required
            >
              <option value="">Select machine…</option>
              {machines.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severity" required>
            <select
              className="input"
              value={createForm.severity}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  severity: e.target.value as ComplaintSeverity,
                })
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Issue Title" required>
              <input
                className="input"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                required
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" required>
              <textarea
                className="input"
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                required
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ErrorText message={createError} />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={create.isPending}
              >
                {create.isPending ? 'Saving…' : 'Report'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Manage / inspect / resolve */}
      <Modal
        open={!!manage}
        onClose={() => setManage(null)}
        title={manage ? `Manage — ${manage.machineName}` : 'Manage'}
        wide
      >
        {manage && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setManageError('');
              save.mutate();
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{manage.title}</p>
              <p className="text-muted-foreground">{manage.description}</p>
            </div>
            <Field label="Status" required>
              <select
                className="input"
                value={manageForm.status}
                onChange={(e) =>
                  setManageForm({
                    ...manageForm,
                    status: e.target.value as ComplaintStatus,
                  })
                }
              >
                {(
                  [
                    'OPEN',
                    'UNDER_INSPECTION',
                    'RESOLVED',
                    'REJECTED',
                  ] as ComplaintStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {COMPLAINT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <select
                className="input"
                value={manageForm.severity}
                onChange={(e) =>
                  setManageForm({
                    ...manageForm,
                    severity: e.target.value as ComplaintSeverity,
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Inspection Notes">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Findings from inspecting the machine…"
                  value={manageForm.inspectionNotes}
                  onChange={(e) =>
                    setManageForm({
                      ...manageForm,
                      inspectionNotes: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Resolution">
                <textarea
                  className="input"
                  rows={2}
                  placeholder="How the issue was resolved (when marking Resolved)…"
                  value={manageForm.resolution}
                  onChange={(e) =>
                    setManageForm({ ...manageForm, resolution: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ErrorText message={manageError} />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setManage(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={save.isPending}
                >
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
