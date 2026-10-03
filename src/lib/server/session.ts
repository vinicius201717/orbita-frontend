import 'server-only';
import { cookies } from 'next/headers';
import Redis from 'ioredis';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { backend, readBackend, ServerApiError } from './backend';
import { encryptSession, decryptSession } from './security';
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['ADMIN', 'BUSINESS_OWNER', 'BUSINESS_STAFF', 'DRIVER']),
  businessId: z.string().uuid().nullable(),
  driverId: z.string().uuid().nullable(),
  phone: z.string().nullable().optional(),
});
const tokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().positive(),
});
const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  user: userSchema,
});
export type WebSession = z.infer<typeof sessionSchema>;
const SESSION_TTL = 30 * 86400;
const cookieName = process.env.NODE_ENV === 'production' ? '__Host-orbita_session' : 'orbita_session';
const singleton = globalThis as typeof globalThis & { orbitaSessionRedis?: Redis };
function store() {
  if (!singleton.orbitaSessionRedis) {
    const url = process.env.FRONTEND_REDIS_URL;
    if (!url) throw new Error('FRONTEND_REDIS_URL required');
    singleton.orbitaSessionRedis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    singleton.orbitaSessionRedis.on('error', () => undefined);
  }
  return singleton.orbitaSessionRedis;
}
function key() {
  return process.env.SESSION_ENCRYPTION_KEY || '';
}
export async function sessionId() {
  const value = (await cookies()).get(cookieName)?.value;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
async function read(id: string) {
  const value = await store().get('orbita:web:session:' + id);
  if (!value) return null;
  try {
    return sessionSchema.parse(decryptSession(value, key()));
  } catch {
    return null;
  }
}
export async function identity(accessToken: string) {
  const path = process.env.BACKEND_IDENTITY_PATH;
  if (!path)
    throw new ServerApiError(
      503,
      'IDENTITY_ENDPOINT_MISSING',
      'O backend ainda não disponibiliza a identificação da sessão.',
    );
  if (path !== '/auth/me') throw new Error('Unsupported identity path');
  return userSchema.parse(await readBackend(await backend(path, {}, accessToken)));
}
export async function createSession(email: string, password: string) {
  if (!process.env.BACKEND_IDENTITY_PATH)
    throw new ServerApiError(
      503,
      'IDENTITY_ENDPOINT_MISSING',
      'Identificação de sessão indisponível no backend atual.',
    );
  const tokens = tokenSchema.parse(
    await readBackend(
      await backend('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    ),
  );
  const user = await identity(tokens.accessToken);
  const data: WebSession = { ...tokens, user, expiresAt: Date.now() + tokens.expiresIn * 1000 };
  const id = randomBytes(32).toString('base64url');
  await store().set('orbita:web:session:' + id, encryptSession(data, key()), 'EX', SESSION_TTL);
  (await cookies()).set(cookieName, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return user;
}
export async function getSession(
  forceRefresh = false,
  rejectedAccessToken?: string,
): Promise<WebSession | null> {
  const id = await sessionId();
  if (!id) return null;
  let current = await read(id);
  if (!current) return null;
  const initialAccess = rejectedAccessToken ?? current.accessToken;
  const canReuse = (value: WebSession) =>
    value.expiresAt > Date.now() + 30000 && (!forceRefresh || value.accessToken !== initialAccess);
  if (canReuse(current)) return current;
  const lock = 'orbita:web:lock:' + id;
  const owner = randomBytes(16).toString('hex');
  const acquired = await store().set(lock, owner, 'EX', 20, 'NX');
  if (!acquired) {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      current = await read(id);
      if (!current) return null;
      if (canReuse(current)) return current;
    }
    throw new ServerApiError(503, 'SESSION_BUSY', 'Sessão em renovação. Tente novamente.');
  }
  try {
    current = await read(id);
    if (!current) return null;
    if (canReuse(current)) return current;
    const response = await backend('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (response.status === 401) {
      await store().del('orbita:web:session:' + id);
      return null;
    }
    const tokens = tokenSchema.parse(await readBackend(response));
    const updated: WebSession = {
      ...current,
      ...tokens,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    };
    const saved = await store().set(
      'orbita:web:session:' + id,
      encryptSession(updated, key()),
      'EX',
      SESSION_TTL,
      'XX',
    );
    return saved ? updated : null;
  } finally {
    await store().eval(
      "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) end return 0",
      1,
      lock,
      owner,
    );
  }
}
export async function updateIdentity(session: WebSession) {
  const user = await identity(session.accessToken);
  const id = await sessionId();
  if (id)
    for (let attempt = 0; attempt < 3; attempt++) {
      const name = 'orbita:web:session:' + id;
      const raw = await store().get(name);
      if (!raw) throw new ServerApiError(401, 'UNAUTHORIZED', 'Sessão encerrada.');
      const current = sessionSchema.parse(decryptSession(raw, key()));
      const saved = await store().eval(
        "if redis.call('get',KEYS[1])==ARGV[1] then redis.call('set',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 end return 0",
        1,
        name,
        raw,
        encryptSession({ ...current, user }, key()),
        String(SESSION_TTL),
      );
      if (saved) break;
    }
  return user;
}
export async function endSession() {
  const id = await sessionId();
  const current = id ? await read(id) : null;
  if (id) await store().del('orbita:web:session:' + id);
  (await cookies()).delete(cookieName);
  if (current) {
    try {
      await backend(
        '/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) },
        current.accessToken,
      );
    } catch {
      /* Local session is already invalidated. */
    }
  }
}
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new ServerApiError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.');
  return session;
}
