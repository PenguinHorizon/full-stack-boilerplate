import axios, { type AxiosError, type AxiosRequestConfig, type Method } from "axios";
import { useStaffSession } from "@/shared/auth/staff-session";
import type { ApiErrorResponse } from "@/shared/types/api.generated";
import { toApiError } from "./errors";

/**
 * Same-origin by default (`/api/v1`): the Vite dev proxy or nginx forwards it
 * to the API, so the refresh cookie stays first-party (ADR-003).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api/v1").replace(
  /\/$/,
  "",
);

declare module "axios" {
  interface AxiosRequestConfig {
    /** Do not attach the staff bearer token (public/auth endpoints). */
    skipAuth?: boolean;
    /** Internal: set once a 401 has triggered a refresh + retry. */
    _retried?: boolean;
  }
}

const http = axios.create({
  baseURL: `${API_BASE_URL}/`,
  timeout: 15_000,
  // Required for the httpOnly refresh cookie.
  withCredentials: true,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = useStaffSession.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Single-flight refresh: N concurrent 401s trigger one /auth/refresh call
 * and all wait on the same promise.
 */
let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshing ??= axios
    .post<{ data: { accessToken: string } }>(`${API_BASE_URL}/auth/refresh`, null, {
      withCredentials: true,
    })
    .then((res) => {
      const token = res.data?.data?.accessToken;
      if (!token) throw new Error("No access token in refresh response");
      useStaffSession.getState().setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const AUTH_ROUTE = /(^|\/)auth\/(refresh|login|logout)$/;

http.interceptors.response.use(
  // Success passes through; request() unwraps the { success, data } envelope.
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original.skipAuth &&
      !original._retried &&
      !AUTH_ROUTE.test(original.url ?? "")
    ) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        // The session is genuinely over; React Router handles the redirect.
        useStaffSession.getState().clearSession();
      }
    }

    // 403 is NOT a sign-out: signed in, but missing a permission.
    return Promise.reject(toApiError(status, error.response?.data, error.message));
  },
);

export interface RequestOptions {
  params?: object;
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Milliseconds; uploads need longer than the 15 s default. */
  timeout?: number;
}

async function request<T>(
  method: Method,
  url: string,
  data?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    method,
    url,
    data,
    params: options.params,
    skipAuth: options.auth === false,
    signal: options.signal,
    headers: options.headers,
    ...(options.timeout ? { timeout: options.timeout } : {}),
  };
  const response = await http.request<{ data: T }>(config);
  return response.data.data;
}

/** Typed helpers; all resolve to the unwrapped `data` and reject with ApiError. */
export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>("GET", url, undefined, options),
  post: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>("POST", url, data, options),
  put: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>("PUT", url, data, options),
  patch: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", url, data, options),
  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>("DELETE", url, undefined, options),
};
