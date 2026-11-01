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

/** True when the platform positively reports a working connection (browsers; native leaves it unset). */
function deviceSaysOnline(): boolean {
  return typeof navigator !== 'undefined' && (navigator as { onLine?: boolean }).onLine === true;
}

/**
 * Returns a user-facing message for any thrown value. "No response" failures are told apart:
 * a timeout, a server that cannot be reached while the device is online (down, blocked, or on web
 * a response without CORS headers), and a device that is offline.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (error.code === 'timeout') {
    return 'The server took too long to answer. Please try again.';
  }
  if (error.isNetwork) {
    return deviceSaysOnline()
      ? "Can't reach the TrainerNearMe server right now. Please try again in a minute."
      : 'No connection. Check your internet and try again.';
  }
  return error.message;
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

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    // Never log the URL query or headers: they can carry ids and the session token.
    console.warn('api request failed', method, path, timedOut ? `timeout after ${timeoutMs}ms` : e instanceof Error ? e.message : String(e));
    throw timedOut
      ? new ApiError(0, 'timeout', 'The server took too long to answer.')
      : new ApiError(0, 'network', 'The request did not reach the server.');
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
