// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptSession, decryptSession } from '@/lib/server/security';
const state = vi.hoisted(() => ({ data: new Map<string, string>(), cookie: 's'.repeat(43) }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: state.cookie }), set: vi.fn(), delete: vi.fn() }),
}));
vi.mock('ioredis', () => ({
  default: class {
    on() {}
    async get(key: string) {
      return state.data.get(key) ?? null;
    }
    async set(key: string, value: string, ...args: unknown[]) {
      if (args.includes('NX') && state.data.has(key)) return null;
      if (args.includes('XX') && !state.data.has(key)) return null;
      state.data.set(key, value);
      return 'OK';
    }
    async del(key: string) {
      return Number(state.data.delete(key));
    }
    async eval(script: string, _count: number, key: string, expected: string, value?: string) {
      if (state.data.get(key) !== expected) return 0;
      if (script.includes("redis.call('set'")) state.data.set(key, value ?? '');
      else state.data.delete(key);
      return 1;
    }
  },
}));
import { getSession, updateIdentity, endSession } from '@/lib/server/session';
const user = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ana',
  email: 'ana@example.test',
  role: 'DRIVER',
  businessId: null,
  driverId: '123e4567-e89b-42d3-a456-426614174001',
};
const sessionKey = 'orbita:web:session:' + 's'.repeat(43),
  key = '1'.repeat(64);
beforeEach(() => {
  state.data.clear();
  process.env.SESSION_ENCRYPTION_KEY = key;
  process.env.FRONTEND_REDIS_URL = 'redis://test';
  process.env.BACKEND_IDENTITY_PATH = '/auth/me';
  vi.unstubAllGlobals();
});
describe('rotating refresh tokens', () => {
  it('waits for a forced rotation instead of returning a still-valid rejected token', async () => {
    state.data.set(
      sessionKey,
      encryptSession(
        {
          accessToken: 'rejected-access',
          refreshToken: 'old-refresh',
          expiresAt: Date.now() + 900000,
          user,
        },
        key,
      ),
    );
    let finish = () => {};
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await pending;
      return Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const first = getSession(true, 'rejected-access');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    let returned = false;
    const second = getSession(true, 'rejected-access').then((value) => {
      returned = true;
      return value;
    });
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(returned).toBe(false);
    finish();
    const results = await Promise.all([first, second]);
    expect(results.map((item) => item?.accessToken)).toEqual(['new-access', 'new-access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('reuses a completed rotation when a delayed request rejects the previous token', async () => {
    state.data.set(
      sessionKey,
      encryptSession(
        { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: Date.now() + 900000, user },
        key,
      ),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await getSession(true, 'old-access'))?.accessToken).toBe('new-access');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('renews concurrent requests once and shares the new access token', async () => {
    state.data.set(
      sessionKey,
      encryptSession(
        { accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: 0, user },
        key,
      ),
    );
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const results = await Promise.all([getSession(), getSession()]);
    expect(results.map((item) => item?.accessToken)).toEqual(['new-access', 'new-access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not overwrite freshly rotated tokens when identity finishes later', async () => {
    const old = { accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: 0, user };
    state.data.set(
      sessionKey,
      encryptSession(
        {
          ...old,
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresAt: Date.now() + 900000,
        },
        key,
      ),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ...user, name: 'Ana updated' })),
    );
    await updateIdentity(old as Parameters<typeof updateIdentity>[0]);
    expect(decryptSession(state.data.get(sessionKey) ?? '', key)).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { name: 'Ana updated' },
    });
  });
  it('removes the server session on logout even when the backend is unavailable', async () => {
    state.data.set(
      sessionKey,
      encryptSession(
        { accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 900000, user },
        key,
      ),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await endSession();
    expect(state.data.has(sessionKey)).toBe(false);
    expect(await getSession()).toBeNull();
  });
});
