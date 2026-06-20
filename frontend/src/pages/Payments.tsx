import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Paginated,
  Consultation,
  PaymentDashboard,
  PaymentStatus,
} from '../lib/types';
import {
  PageHeader,
  Card,
  StatCard,
  Spinner,
  EmptyState,
  Pagination,
  PaymentBadge,
} from '../components/ui';
import { currency, formatDateTime } from '../lib/format';

export default function Payments() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | ''>('DUE');

  const dash = useQuery({
    queryKey: ['payment-dashboard'],
    queryFn: async () =>
      (await api.get<PaymentDashboard>('/dashboard/payments')).data,
  });

  const list = useQuery({
    queryKey: ['payments-consultations', page, status],
    queryFn: async () =>
      (
        await api.get<Paginated<Consultation>>('/consultations', {
          params: { page, limit: 10, paymentStatus: status || undefined },
        })
      ).data,
  });

  const d = dash.data;

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Clinic collection overview and pending dues"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Collection"
          value={currency(d?.todaysCollection ?? 0)}
          accent="text-success"
        />
        <StatCard
          label="Total Revenue"
          value={currency(d?.totalRevenue ?? 0)}
          accent="text-success"
        />
        <StatCard
          label="Total Due"
          value={currency(d?.totalDue ?? 0)}
          accent="text-error"
        />
        <StatCard
          label="Pending Payments"
          value={d?.pendingPayments ?? 0}
          accent="text-error"
        />
      </div>

      <Card className="!p-0">
        <div className="flex gap-3 border-b border-border p-4">
          {(['DUE', 'PAID', ''] as const).map((s) => (
            <button
              key={s || 'ALL'}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                status === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === '' ? 'All' : s === 'DUE' ? 'Due' : 'Paid'}
            </button>
          ))}
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.data.length ? (
          <EmptyState message="No payments found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.data.map((c) => (
                  <tr
                    key={c.id}
                    className={c.payment?.status === 'DUE' ? 'bg-error/10' : ''}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(c.consultationDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.patient?.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(c.payment?.consultationFee ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {currency(c.payment?.amountPaid ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.payment?.method}
                    </td>
                    <td className="px-4 py-3">
                      {c.payment && <PaymentBadge status={c.payment.status} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/consultations/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        Manage
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
