import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, fetchAllPaginated } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Paginated, Consultation, PaymentStatus } from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Pagination,
  PaymentBadge,
} from '../components/ui';
import { currency, formatDateTime, todayISO } from '../lib/format';
import { ExportMenu } from '../components/ExportMenu';
import { DateRangeFilter } from '../components/DateRangeFilter';
import type { ExportColumn } from '../lib/export';

const EXPORT_COLUMNS: ExportColumn<Consultation>[] = [
  { header: 'Date', value: (c) => formatDateTime(c.consultationDate) },
  { header: 'Patient', value: (c) => c.patient?.fullName ?? '' },
  { header: 'Physiotherapist', value: (c) => c.physiotherapist?.name ?? '' },
  { header: 'Diagnosis', value: (c) => c.diagnosis ?? '' },
  { header: 'Fee', value: (c) => c.payment?.consultationFee ?? '' },
  { header: 'Payment', value: (c) => c.payment?.status ?? '' },
];

export default function Consultations() {
  const { can, user } = useAuth();
  // Super admin views clinic data read-only via the global clinic selector.
  const canWrite = (perm: string) => can(perm) && user?.role !== 'SUPER_ADMIN';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const list = useQuery({
    queryKey: ['consultations', page, search, status, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<Paginated<Consultation>>('/consultations', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            paymentStatus: status || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  });

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle="All patient visits, latest first"
        action={
          canWrite('consultations.create') && (
            <Link to="/consultations/new" className="btn-primary">
              + New Consultation
            </Link>
          )
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <input
            className="input max-w-xs"
            placeholder="Search patient / diagnosis…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input max-w-[160px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus | '');
              setPage(1);
            }}
          >
            <option value="">All payments</option>
            <option value="PAID">Paid</option>
            <option value="DUE">Due</option>
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
              filename="consultations"
              title="Consultations"
              columns={EXPORT_COLUMNS}
              fetchRows={() =>
                fetchAllPaginated<Consultation>('/consultations', {
                  search: search || undefined,
                  paymentStatus: status || undefined,
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
          <EmptyState message="No consultations found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Physiotherapist</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-muted ${
                      c.payment?.status === 'DUE' ? 'bg-error/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(c.consultationDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.patient?.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.physiotherapist?.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.diagnosis || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.payment ? currency(c.payment.consultationFee) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.payment && <PaymentBadge status={c.payment.status} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/consultations/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
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
    </div>
  );
}
