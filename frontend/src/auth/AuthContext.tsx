import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api, setToken, clearToken, getToken } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Re-fetch the current user (e.g. after a profile update). */
  refreshUser: () => Promise<void>;
  /** True if the current user holds the given permission key. */
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { email, password },
    );
    setToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    const res = await api.get<AuthUser>('/auth/me');
    setUser(res.data);
  };

  const can = (permission: string) =>
    !!user?.permissions?.includes(permission);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, can }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
