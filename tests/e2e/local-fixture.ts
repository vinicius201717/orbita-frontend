/** Test-only bridge for the documented missing /auth/me contract. Never imported by src/. */
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import Redis from 'ioredis';
import type { BrowserContext } from '@playwright/test';
import { encryptSession } from '../../src/lib/server/security';
import type { SessionUser } from '../../src/types/auth';
const env = parse(readFileSync(resolve('.env.local')));
const apiUrl = env.BACKEND_API_URL;
if (
  ![apiUrl, env.FRONTEND_REDIS_URL].every((value) =>
    ['localhost', '127.0.0.1'].includes(new URL(value).hostname),
  )
)
  throw new Error('Operational E2E fixtures require local API and Redis.');
type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export type Account = { tokens: Tokens; user: SessionUser };
export const runId = randomUUID().replaceAll('-', '').slice(0, 12);
export async function backend<T>(
  path: string,
  account?: Account,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(apiUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(account ? { Authorization: `Bearer ${account.tokens.accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`${method} ${path}: ${response.status} ${data.code || data.error?.code || ''}`);
  }
  return response.json() as Promise<T>;
}
export async function account(role: 'BUSINESS_OWNER' | 'DRIVER'): Promise<Account> {
  const email = `frontend-e2e-${role.toLowerCase()}-${runId}@example.test`;
  const password = randomBytes(24).toString('base64url');
  const name = `Frontend E2E ${role}`;
  const phone =
    '+55' +
    String(BigInt('0x' + randomBytes(6).toString('hex')))
      .slice(0, 11)
      .padEnd(11, '0');
  const identity = await backend<{ id: string; email: string; role: SessionUser['role'] }>(
    '/auth/register',
    undefined,
    'POST',
    { name, email, password, phone, role },
  );
  const tokens = await backend<Tokens>('/auth/login', undefined, 'POST', { email, password });
  const result: Account = { tokens, user: { ...identity, name, businessId: null, driverId: null } };
  if (role === 'DRIVER') result.user.driverId = (await backend<{ id: string }>('/driver/me', result)).id;
  return result;
}
export async function administrator(): Promise<Account> {
  const backendEnv = process.env.E2E_ADMIN_PASSWORD
    ? {}
    : parse(readFileSync(process.env.E2E_BACKEND_ENV || resolve('../Orbita/.env')));
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@orbita.example';
  const password = process.env.E2E_ADMIN_PASSWORD || backendEnv.SEED_PASSWORD;
  if (!password) throw new Error('Set E2E_ADMIN_PASSWORD or supply the local backend seed environment.');
  const tokens = await backend<Tokens>('/auth/login', undefined, 'POST', { email, password });
  const id = JSON.parse(Buffer.from(tokens.accessToken.split('.')[1], 'base64url').toString())
    .sub as string;
  const result: Account = {
    tokens,
    user: {
      id,
      email,
      name: 'Local E2E administrator',
      role: 'ADMIN',
      businessId: null,
      driverId: null,
    },
  };
  // Decoded claims are not authorization: verify the fixture via an admin-only API.
  await backend('/analytics/platform/overview', result);
  return result;
}
export async function browserSession(context: BrowserContext, identity: Account) {
  const redis = new Redis(env.FRONTEND_REDIS_URL, { maxRetriesPerRequest: 1 });
  const sid = randomBytes(32).toString('base64url');
  const key = 'orbita:web:session:' + sid;
  await redis.set(
    key,
    encryptSession(
      {
        ...identity.tokens,
        user: identity.user,
        expiresAt: Date.now() + identity.tokens.expiresIn * 1000,
      },
      env.SESSION_ENCRYPTION_KEY,
    ),
    'EX',
    600,
  );
  await context.addCookies([
    {
      name: 'orbita_session',
      value: sid,
      url: 'http://localhost:3001',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  // Only missing identity is controlled; operations cross the real BFF and backend.
  await context.route('http://localhost:3001/api/session', (route) =>
    route.fulfill({ json: { user: identity.user } }),
  );
  return async () => {
    await redis.del(key);
    await redis.quit();
  };
}
