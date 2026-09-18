import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiFailure, AuthSession } from '@grovia/shared';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'X-Requested-With': 'grovia-web' },
});

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  constructor(status: number, body: ApiFailure['error'] | undefined, fallback: string) {
    super(body?.message ?? fallback);
    this.name = 'ApiClientError'; this.status = status; this.code = body?.code ?? 'INTERNAL';
    this.details = body?.details; this.requestId = body?.requestId;
  }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await axios.post<{ data: AuthSession }>(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true, headers: { 'X-Requested-With': 'grovia-web' } });
      useAuthStore.getState().setSession(res.data.data); return res.data.data.accessToken;
    } catch { useAuthStore.getState().clearSession(); return null; }
    finally { refreshInFlight = null; }
  })();
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };
api.interceptors.response.use((res) => res, async (error: AxiosError<ApiFailure>) => {
  const config = error.config as RetriableConfig | undefined;
  const body = error.response?.data?.error;
  const shouldRefresh = error.response?.status === 401 && body?.code === 'TOKEN_EXPIRED' && config && !config._retried && !config.url?.includes('/auth/refresh');
  if (shouldRefresh) { config._retried = true; const token = await refreshAccessToken(); if (token) { config.headers.Authorization = `Bearer ${token}`; return api.request(config); } }
  if (error.response) throw new ApiClientError(error.response.status, body, 'Request failed.');
  throw new ApiClientError(0, undefined, 'Cannot reach Grovia. Check your connection.');
});

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> { const res = await api.get<{data:T}>(url,{params}); return res.data.data; }
export async function post<T>(url: string, body?: unknown): Promise<T> { const res = await api.post<{data:T}>(url,body); return res.data.data; }
export async function patch<T>(url: string, body?: unknown): Promise<T> { const res = await api.patch<{data:T}>(url,body); return res.data.data; }
export async function del<T=void>(url: string): Promise<T> { const res = await api.delete<{data:T}>(url); return res.data.data; }
export { refreshAccessToken };
