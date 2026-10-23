import { config } from '../config';
import { getToken } from './tokenStore';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * A failed API call. `status` is the HTTP status (0 when the request never reached the server),
 * `code` the server's machine-readable error code, `message` safe to show to the user.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/** Returns a user-facing message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    return error.isNetwork ? 'No connection. Check your internet and try again.' : error.message;
  }
  return fallback;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Registers what to do when the server rejects the session (AuthContext signs the user out). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
  query?: Query;
  body?: unknown;
  /** Send without the session token (sign-in, public config). */
  anonymous?: boolean;
  timeoutMs?: number;
  /** Raw body (e.g. FormData for uploads); takes precedence over `body`. */
  formData?: FormData;
};

function buildUrl(path: string, query?: Query): string {
  const url = `${config.backendUrl}${path}`;
  if (!query) {
    return url;
  }
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

type ErrorBody = { error?: string | { code?: string; message?: string } };

async function toApiError(response: Response): Promise<ApiError> {
  let code = `http_${response.status}`;
  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as ErrorBody;
    if (typeof body.error === 'string') {
      message = body.error;
    } else if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  return new ApiError(response.status, code, message);
}

/**
 * The single way screens talk to the backend (through the service modules).
 * Adds the session token, enforces a timeout, parses JSON and throws ApiError on failure.
 * A 401 on an authenticated call triggers the registered sign-out handler.
 */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (!options.anonymous) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'network', 'No connection. Check your internet and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (response.status === 401 && !options.anonymous && onUnauthorized) {
      onUnauthorized();
    }
    throw error;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('DELETE', path, { ...options, body }),
};
