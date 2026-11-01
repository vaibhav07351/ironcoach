jest.mock('../app/config', () => ({ config: { backendUrl: 'https://api.test' } }));
jest.mock('../app/services/tokenStore', () => ({
  getToken: jest.fn().mockResolvedValue('tok123'),
}));

import { ApiError, errorMessage, http, setUnauthorizedHandler } from '../app/services/http';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('http client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    setUnauthorizedHandler(null);
  });

  it('sends a Bearer token and query params, and parses JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const res = await http.get<{ ok: boolean }>('/x', { query: { a: 1, b: undefined, c: 'two words' } });
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/x?a=1&c=two%20words');
    expect(init.headers.Authorization).toBe('Bearer tok123');
  });

  it('omits the token for anonymous calls', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await http.post('/auth/google', { id_token: 'x' }, { anonymous: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('turns structured errors into ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: { code: 'entry_exists', message: 'already there' } }));
    await expect(http.post('/diet_entries', {})).rejects.toMatchObject({
      status: 409,
      code: 'entry_exists',
      message: 'already there',
    });
  });

  it('understands legacy string errors and non-JSON bodies', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'bad thing' }));
    await expect(http.get('/a')).rejects.toMatchObject({ status: 400, message: 'bad thing' });
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502 }));
    await expect(http.get('/b')).rejects.toMatchObject({ status: 502, code: 'http_502' });
  });

  it('signs out on 401 for authenticated calls only', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: 'token_invalid', message: 'expired' } }));
    await expect(http.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);

    await expect(http.post('/auth/google', {}, { anonymous: true })).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  describe('requests that get no response', () => {
    let warn: jest.SpyInstance;
    const realNavigator = global.navigator;
    const setOnline = (onLine: boolean | undefined): void => {
      Object.defineProperty(global, 'navigator', { value: { onLine }, configurable: true });
    };

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      warn.mockRestore();
      Object.defineProperty(global, 'navigator', { value: realNavigator, configurable: true });
      jest.useRealTimers();
    });

    it('reports network failures as status 0 and logs the real cause', async () => {
      setOnline(undefined);
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      const error = await http.get('/x', { query: { secret: 'q' } }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).isNetwork).toBe(true);
      expect((error as ApiError).code).toBe('network');
      expect(errorMessage(error)).toMatch(/No connection/);
      expect(warn).toHaveBeenCalledWith('api request failed', 'GET', '/x', 'Network request failed');
      expect(JSON.stringify(warn.mock.calls)).not.toMatch(/tok123|secret/);
    });

    it('blames the server, not the internet, when the device is online', async () => {
      setOnline(true);
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const error = await http.post('/auth/google', {}, { anonymous: true }).catch((e: unknown) => e);
      expect(errorMessage(error)).toMatch(/Can't reach the TrainerNearMe server/);
    });

    it('reports a timeout separately, still as no response', async () => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
          })
      );
      const pending = http.get('/slow', { timeoutMs: 1000 }).catch((e: unknown) => e);
      await jest.advanceTimersByTimeAsync(1000);
      const error = await pending;
      expect((error as ApiError).code).toBe('timeout');
      expect((error as ApiError).isNetwork).toBe(true);
      expect(errorMessage(error)).toMatch(/took too long/);
      expect(warn).toHaveBeenCalledWith('api request failed', 'GET', '/slow', 'timeout after 1000ms');
    });
  });

  it('handles 204 and empty bodies', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(http.delete('/x')).resolves.toBeUndefined();
  });

  it('hides unknown errors behind a generic message', () => {
    expect(errorMessage(new Error('secret internals'))).toBe('Something went wrong. Please try again.');
  });
});
