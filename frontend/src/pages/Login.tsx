import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../lib/api';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) navigate('/', { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const quick = (e: string) => {
    setEmail(e);
    setPassword('Passw0rd!');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-500 p-4">
      {/* soft decorative glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-400/40 blur-3xl" />
      <div className="card relative w-full max-w-md p-8 shadow-glow">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl shadow-glow">
            🩺
          </div>
          <h1 className="mt-3 bg-gradient-to-r from-brand-700 to-accent-600 bg-clip-text text-2xl font-bold text-transparent">
            PhysioCare
          </h1>
          <p className="text-sm text-muted-foreground">Clinic Management System</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Demo accounts (password: Passw0rd!)
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button onClick={() => quick('super@admin.com')} className="btn-secondary px-2 py-1">
              Super
            </button>
            <button onClick={() => quick('admin@sunrise.com')} className="btn-secondary px-2 py-1">
              Admin
            </button>
            <button onClick={() => quick('physio@sunrise.com')} className="btn-secondary px-2 py-1">
              Physio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
