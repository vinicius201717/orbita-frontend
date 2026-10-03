// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { encryptSession, decryptSession, sameOrigin } from '@/lib/server/security';
import { allowedEndpoint } from '@/lib/server/allowlist';
import { canAccess, homeForRole } from '@/lib/access';
const id = '123e4567-e89b-42d3-a456-426614174000';
describe('session and BFF boundaries', () => {
  it('encrypts sensitive session data and rejects tampering', () => {
    const key = '1'.repeat(64),
      session = { refreshToken: 'private', role: 'DRIVER' };
    const encrypted = encryptSession(session, key);
    expect(encrypted).not.toContain('private');
    expect(decryptSession(encrypted, key)).toEqual(session);
    const bytes = Buffer.from(encrypted, 'base64url');
    bytes[30] ^= 1;
    expect(() => decryptSession(bytes.toString('base64url'), key)).toThrow();
  });
  it('requires the configured exact Origin for cookie mutations', () => {
    expect(
      sameOrigin(
        new Request('http://localhost:3001/api', { headers: { origin: 'http://localhost:3001' } }),
        'http://localhost:3001',
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new Request('http://localhost:3001/api', { headers: { origin: 'https://evil.example' } }),
        'http://localhost:3001',
      ),
    ).toBe(false);
    expect(sameOrigin(new Request('http://localhost:3001/api'), 'http://localhost:3001')).toBe(false);
  });
  it('allows real domain operations and blocks auth, unknown resources and traversal', () => {
    expect(allowedEndpoint('/deliveries/' + id + '/ready', 'POST')).toBe(true);
    expect(allowedEndpoint('/admin/deliveries/' + id + '/confirm', 'POST')).toBe(true);
    expect(allowedEndpoint('/admin/drivers', 'GET')).toBe(true);
    for (const path of [
      '/auth/refresh',
      '/admin/users',
      '/driver/documents',
      '/../auth/refresh',
      '/deliveries/%2e%2e',
    ])
      expect(allowedEndpoint(path, 'POST')).toBe(false);
    expect(allowedEndpoint('/deliveries/' + id + '/confirm', 'POST')).toBe(false);
  });
  it('routes each profile to its own area', () => {
    expect(homeForRole('DRIVER')).toBe('/app/entregador');
    expect(canAccess('DRIVER', '/admin')).toBe(false);
    expect(canAccess('BUSINESS_OWNER', '/app/entregador/ofertas')).toBe(false);
    expect(canAccess('BUSINESS_STAFF', '/app/entregas')).toBe(true);
    expect(canAccess('ADMIN', '/admin/financeiro')).toBe(true);
  });
});
