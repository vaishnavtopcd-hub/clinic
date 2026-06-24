import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError, fetchAllPaginated } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Paginated, Patient, Gender } from '../lib/types';
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
import { formatDate } from '../lib/format';
import { ExportMenu } from '../components/ExportMenu';
import { DateRangeFilter } from '../components/DateRangeFilter';
import type { ExportColumn } from '../lib/export';

const EXPORT_COLUMNS: ExportColumn<Patient>[] = [
  { header: 'Patient ID', value: (p) => p.patientCode },
  { header: 'Name', value: (p) => p.fullName },
  { header: 'Age', value: (p) => p.age ?? '' },
  { header: 'Gender', value: (p) => p.gender ?? '' },
  { header: 'Phone', value: (p) => p.phone },
  { header: 'Registered', value: (p) => formatDate(p.createdAt) },
];

const empty = {
  fullName: '',
  phone: '',
  age: '',
  gender: '' as Gender | '',
  dob: '',
  bloodGroup: '',
  altPhone: '',
  address: '',
  emergencyContact: '',
};

export default function Patients() {
  const qc = useQueryClient();
  const { can, user } = useAuth();
  // Super admin views clinic data read-only via the global clinic selector.
  const canWrite = (perm: string) => can(perm) && user?.role !== 'SUPER_ADMIN';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['patients', page, search, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<Patient>>('/patients', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        fullName: form.fullName,
        phone: form.phone,
        age: form.age !== '' ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        bloodGroup: form.bloodGroup || undefined,
        altPhone: form.altPhone || undefined,
        address: form.address || undefined,
        emergencyContact: form.emergencyContact || undefined,
      };
      if (editing) return api.patch(`/patients/${editing.id}`, payload);
      return api.post('/patients', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      setModalOpen(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setError('');
    setModalOpen(true);
  };
  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      fullName: p.fullName,
      phone: p.phone,
      age: p.age?.toString() ?? '',
      gender: p.gender ?? '',
      dob: p.dob ?? '',
      bloodGroup: p.bloodGroup ?? '',
      altPhone: p.altPhone ?? '',
      address: p.address ?? '',
      emergencyContact: p.emergencyContact ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Register and manage clinic patients"
        action={
          canWrite('patients.create') && (
            <button className="btn-primary" onClick={openCreate}>
              + Register Patient
            </button>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <input
            className="input max-w-sm"
            placeholder="Search by name, phone or patient ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
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
              filename="patients"
              title="Patients"
              columns={EXPORT_COLUMNS}
              fetchRows={() =>
                fetchAllPaginated<Patient>('/patients', {
                  search: search || undefined,
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
                {list.data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-mono text-xs">{p.patientCode}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/patients/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.age ?? '—'} {p.gender ? `· ${p.gender[0]}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite('patients.edit') && (
                        <button
                          className="text-primary hover:underline"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                      )}
                      {canWrite('consultations.create') && (
                        <Link
                          to={`/consultations/new?patientId=${p.id}`}
                          className="ml-3 text-success hover:underline"
                        >
                          New Consultation
                        </Link>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Patient' : 'Register Patient'}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Full Name" required>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              required
            />
          </Field>
          <Field label="Phone Number" required>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
            />
          </Field>
          <Field label="Age" required>
            <input
              type="number"
              className="input"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              min={0}
              max={150}
              required
            />
          </Field>
          <Field label="Gender" required>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
              required
            >
              <option value="">Select…</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              className="input"
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
            />
          </Field>
          <Field label="Blood Group">
            <input
              className="input"
              value={form.bloodGroup}
              onChange={(e) => set('bloodGroup', e.target.value)}
            />
          </Field>
          <Field label="Alternate Phone">
            <input
              className="input"
              value={form.altPhone}
              onChange={(e) => set('altPhone', e.target.value)}
            />
          </Field>
          <Field label="Emergency Contact">
            <input
              className="input"
              value={form.emergencyContact}
              onChange={(e) => set('emergencyContact', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea
                className="input"
                rows={2}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ErrorText message={error} />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : editing ? 'Update' : 'Register'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
