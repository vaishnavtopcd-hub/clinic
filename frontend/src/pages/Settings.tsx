import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { PageHeader, Card, Field, ErrorText } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: async () => api.post('/auth/change-password', form),
    onSuccess: () => {
      setDone(true);
      setForm({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Account and profile settings" />

      <Card className="mb-5">
        <h3 className="mb-3 font-semibold text-foreground">Profile</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Name" value={user?.name} />
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={user?.role.replace('_', ' ')} />
          {user?.clinic && <Row label="Clinic" value={user.clinic.name} />}
          {user?.specialization && (
            <Row label="Specialization" value={user.specialization} />
          )}
        </dl>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-foreground">Change Password</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setDone(false);
            change.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Current Password" required>
            <input
              type="password"
              className="input"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
              required
            />
          </Field>
          <Field label="New Password (min 6 chars)" required>
            <input
              type="password"
              className="input"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              minLength={6}
              required
            />
          </Field>
          <ErrorText message={error} />
          {done && (
            <p className="text-sm text-success">Password updated successfully.</p>
          )}
          <button type="submit" className="btn-primary" disabled={change.isPending}>
            {change.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
