/** Local fixture that uses the same login and session BFF as a browser user. */
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import type { BrowserContext } from '@playwright/test';
import type { SessionUser } from '../../src/types/auth';
const env = parse(readFileSync(resolve('.env.local')));
const apiUrl = env.BACKEND_API_URL;
if (!apiUrl || !['localhost', '127.0.0.1'].includes(new URL(apiUrl).hostname))
  throw new Error('Operational E2E fixtures require a local API.');
type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export type Account = { tokens: Tokens; user: SessionUser; email: string; password: string };
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
  const accountRunId = randomUUID().replaceAll('-', '').slice(0, 12);
  const email = `frontend-e2e-${role.toLowerCase()}-${runId}-${accountRunId}@example.test`;
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
  const result: Account = {
    tokens,
    user: { ...identity, name, businessId: null, driverId: null },
    email,
    password,
  };
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
  const provisional: Account = {
    tokens,
    user: {} as SessionUser,
    email,
    password,
  };
  const user = await backend<SessionUser>('/auth/me', provisional);
  const result: Account = {
    tokens,
    user,
    email,
    password,
  };
  // Verify the account through an admin-only API before browser work starts.
  await backend('/analytics/platform/overview', result);
  return result;
}
export async function browserSession(context: BrowserContext, identity: Account) {
  const response = await context.request.post('http://localhost:3001/api/session/login', {
    headers: { Origin: 'http://localhost:3001' },
    data: { email: identity.email, password: identity.password },
  });
  if (!response.ok()) throw new Error(`Browser login failed: ${response.status()}`);
  return async () => {
    await context.request.post('http://localhost:3001/api/session/logout', {
      headers: { Origin: 'http://localhost:3001' },
    });
  };
}
