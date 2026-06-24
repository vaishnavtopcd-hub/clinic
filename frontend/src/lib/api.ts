import axios from 'axios';

const TOKEN_KEY = 'physio_token';
const CLINIC_KEY = 'physio_active_clinic';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Global clinic scope (super admin only): sent as X-Clinic-Id on every request. */
export const getActiveClinic = () => localStorage.getItem(CLINIC_KEY) ?? '';
export const setActiveClinic = (id: string) => {
  if (id) localStorage.setItem(CLINIC_KEY, id);
  else localStorage.removeItem(CLINIC_KEY);
};

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const clinic = getActiveClinic();
  if (clinic) {
    config.headers['X-Clinic-Id'] = clinic;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Auto-logout on 401 (expired/invalid token), but not on the login call.
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Fetches every row of a paginated list endpoint by walking pages at the
 * server's max page size (100). Use for exports where the 100-row cap on a
 * single request would otherwise truncate the data. Non-paginated endpoints
 * (no `totalPages`) return their single payload.
 */
export async function fetchAllPaginated<T>(
  url: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const limit = 100;
  const all: T[] = [];
  let page = 1;
  // Hard cap (200 pages = 20k rows) guards against runaway loops.
  while (page <= 200) {
    const res = (await api.get(url, { params: { ...params, page, limit } })).data;
    const batch: T[] = res?.data ?? [];
    all.push(...batch);
    const totalPages = res?.totalPages;
    if (!totalPages || page >= totalPages || batch.length < limit) break;
    page++;
  }
  return all;
}

/** Extracts a human-readable message from an axios error. */
export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    return err.message;
  }
  return 'Unexpected error';
}
