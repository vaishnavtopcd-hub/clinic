import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Paginated, Patient, Consultation } from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Pagination,
} from '../components/ui';
import { VisitHistoryList } from '../components/VisitHistoryList';
import { formatDate } from '../lib/format';

export default function VisitHistory() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Patient | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Reuse the shared paginated patients endpoint — it already searches by
  // name, phone and patient code.
  const patients = useQuery({
    queryKey: ['vh-patients', page, search],
    queryFn: async () =>
      (
        await api.get<Paginated<Patient>>('/patients', {
          params: { page, limit: 10, search: search || undefined },
        })
      ).data,
  });

  const history = useQuery({
    queryKey: ['visit-history', selected?.id],
    enabled: !!selected,
    queryFn: async () =>
      (
        await api.get<Consultation[]>(
          `/consultations/patient/${selected!.id}/history`,
        )
      ).data,
  });

  const viewHistory = (p: Patient) => {
    setSelected(p);
    // Bring the history into view (helps on smaller screens).
    requestAnimationFrame(() =>
      historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  return (
    <div>
      <PageHeader
        title="Visit History"
        subtitle="Search a patient to view their complete visit history"
      />

      <Card className="!p-0">
        <div className="border-b border-border p-4">
          <input
            className="input max-w-sm"
            placeholder="Search by name, phone or patient ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {patients.isLoading ? (
          <Spinner />
        ) : !patients.data?.data.length ? (
          <EmptyState message="No patients found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.data.data.map((p) => (
                  <tr
                    key={p.id}
                    className={
                      selected?.id === p.id ? 'bg-primary/10' : 'hover:bg-muted'
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.patientCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.age ?? '—'} {p.gender ? `· ${p.gender[0]}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => viewHistory(p)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={patients.data.totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      <div ref={historyRef} className="mt-6 scroll-mt-20">
        {!selected ? (
          <EmptyState message="Select a patient above to view their visit history" />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Visit History —{' '}
                <span className="text-primary">{selected.fullName}</span>{' '}
                <span className="font-mono text-sm text-muted-foreground">
                  ({selected.patientCode})
                </span>
              </h2>
              <button
                className="btn-secondary px-3 py-1.5"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            {history.isLoading ? (
              <Spinner />
            ) : (
              <VisitHistoryList visits={history.data ?? []} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
