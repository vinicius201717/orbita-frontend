import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readJson } from '@/lib/server/request';
describe('BFF mutation bodies', () => {
  it('allows an empty readable stream for bodyless operational actions', async () => {
    await expect(
      readJson(new Request('http://localhost/action', { method: 'POST', body: '' })),
    ).resolves.toEqual({});
  });
  it('rejects malformed and oversized bodies while accepting valid JSON', async () => {
    await expect(
      readJson(new Request('http://localhost/action', { method: 'POST', body: '{bad' })),
    ).rejects.toMatchObject({ code: 'INVALID_JSON' });
    await expect(
      readJson(
        new Request('http://localhost/action', { method: 'POST', body: 'x'.repeat(256 * 1024 + 1) }),
      ),
    ).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' });
    await expect(
      readJson(new Request('http://localhost/action', { method: 'POST', body: '{"granted":true}' })),
    ).resolves.toEqual({ granted: true });
  });
});
