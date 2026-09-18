import Constants from 'expo-constants';

export function getBackendUrl(): string {
  const url = Constants.expoConfig?.extra?.backendUrl as string | undefined;
  if (!url) {
    throw new Error('backendUrl is not configured in app.json');
  }
  return url.replace(/\/$/, '');
}

export type ApiErrorBody = {
  error?: string | { code?: string; message?: string };
};

export async function parseApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.error === 'string') {
      return body.error;
    }
    if (body.error && typeof body.error === 'object' && body.error.message) {
      return body.error.message;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = token;
    }

    return await fetch(`${getBackendUrl()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
