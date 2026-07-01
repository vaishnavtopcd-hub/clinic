import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Paginated, Machine, MachineUsageSummary } from '../lib/types';
import {
  PageHeader,
  Card,
  StatCard,
  Spinner,
  EmptyState,
  Pagination,
  Modal,
  Field,
  ErrorText,
  StatusPill,
} from '../components/ui';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { todayISO, formatDate } from '../lib/format';

export default function Machines() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const isSuper = user?.role === 'SUPER_ADMIN';
  // Super admin manages global machines; others need the machines.manage permission.
  const canManage = isSuper || can('machines.manage');

  const list = useQuery({
    queryKey: ['machines', page, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<Machine>>('/machines', {
          params: {
            page,
            limit: 10,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        ...(editing ? { isActive: form.isActive } : {}),
      };
      if (editing) return api.patch(`/machines/${editing.id}`, payload);
      return api.post('/machines', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const toggle = useMutation({
    mutationFn: async (m: Machine) =>
      api.patch(`/machines/${m.id}`, { isActive: !m.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] }),
  });

  // --- Usage summary ---
  const [usageFor, setUsageFor] = useState<Machine | null>(null);
  const [uFrom, setUFrom] = useState('');
  const [uTo, setUTo] = useState('');
  const usage = useQuery({
    queryKey: ['machine-usage', usageFor?.id, uFrom, uTo],
    enabled: !!usageFor,
    queryFn: async () =>
      (
        await api.get<MachineUsageSummary>(`/machines/${usageFor!.id}/usage`, {
          params: { dateFrom: uFrom || undefined, dateTo: uTo || undefined },
        })
      ).data,
  });
  const openUsage = (m: Machine) => {
    setUFrom('');
    setUTo('');
    setUsageFor(m);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', isActive: true });
    setError('');
    setModal(true);
  };
  const openEdit = (m: Machine) => {
    setEditing(m);
    setForm({ name: m.name, description: m.description ?? '', isActive: m.isActive });
    setError('');
    setModal(true);
  };

  // A clinic admin can only manage clinic-owned machines (clinicId set).
  const canManageRow = (m: Machine) =>
    isSuper ? m.clinicId === null : m.clinicId === user?.clinicId;

  return (
    <div>
      <PageHeader
        title="Machines"
        subtitle={
          isSuper
            ? 'Global machine master (available to all clinics)'
            : 'Treatment machines for your clinic (plus global machines)'
        }
        action={
          canManage && (
            <button className="btn-primary" onClick={openCreate}>
              + Add Machine
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
              setPage(1);
            }}
          />
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message="No machines yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((m) => (
                  <tr key={m.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {m.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {m.clinicId === null ? 'Global' : 'Clinic'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={m.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => openUsage(m)}
                      >
                        Usage
                      </button>
                      {canManage && canManageRow(m) && (
                        <>
                          <button
                            className="ml-3 text-primary hover:underline"
                            onClick={() => openEdit(m)}
                          >
                            Edit
                          </button>
                          <button
                            className="ml-3 text-muted-foreground hover:underline"
                            onClick={() => toggle.mutate(m)}
                          >
                            {m.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </>
                      )}
                    </td>
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Machine' : 'Add Machine'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Machine Name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>
          )}
          <ErrorText message={error} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!usageFor}
        onClose={() => setUsageFor(null)}
        title={`Usage — ${usageFor?.name ?? ''}`}
        wide
      >
        <div className="mb-4">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Filter by date (default: all time)
          </span>
          <DateRangeFilter
            from={uFrom}
            to={uTo}
            onChange={({ from, to }) => {
              setUFrom(from);
              setUTo(to);
            }}
          />
        </div>

        {usage.isLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Total Hours"
                value={`${usage.data?.totalHours ?? 0} h`}
                hint={`${usage.data?.totalMinutes ?? 0} min`}
                accent="text-primary"
              />
              <StatCard label="Sessions" value={usage.data?.totalSessions ?? 0} />
              <StatCard
                label="Avg / Session"
                value={`${usage.data?.avgMinutes ?? 0} min`}
              />
              <StatCard
                label="Last Used"
                value={
                  usage.data?.lastUsedAt
                    ? formatDate(usage.data.lastUsedAt)
                    : '—'
                }
              />
            </div>

            <h4 className="mb-2 mt-6 font-semibold text-foreground">
              Recent Usage
            </h4>
            {usage.data?.recent.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Patient</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usage.data.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 text-muted-foreground">
                          {formatDate(r.date)}
                        </td>
                        <td className="py-2 font-medium text-foreground">
                          {r.patientName || '—'}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {r.durationMinutes} min
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {r.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No usage recorded for this range." />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
