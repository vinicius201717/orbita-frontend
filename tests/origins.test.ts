import { describe, expect, it } from 'vitest';
import { allowedOrigins } from '@/lib/server/origins';
import { sameOrigin } from '@/lib/server/security';

describe('configured CSRF origins', () => {
  it('uses deployment-owned Vercel URLs without accepting arbitrary request hosts', () => {
    const origins = allowedOrigins({ NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production', VERCEL_URL: 'build.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'orbita-frontend-phi.vercel.app' });
    const legitimate = new Request('https://internal/api', { headers: { Origin: 'https://orbita-frontend-phi.vercel.app' } });
    expect(origins.some((origin) => sameOrigin(legitimate, origin))).toBe(true);
    for (const origin of ['https://evil.example', 'https://orbita-frontend-phi.vercel.app.evil.example', 'null', '']) {
      const request = new Request('https://evil.example/api', { headers: { Origin: origin, Host: 'evil.example', 'X-Forwarded-Host': 'evil.example' } });
      expect(origins.some((allowed) => sameOrigin(request, allowed))).toBe(false);
    }
  });
  it('fails closed on missing or invalid production configuration', () => {
    expect(() => allowedOrigins({ NODE_ENV: 'production' })).toThrow();
    for (const APP_URL of ['https://example.test/path', 'https://user:pass@example.test', 'http://example.test', 'https://example.test?x=1'])
      expect(() => allowedOrigins({ NODE_ENV: 'production', APP_URL })).toThrow();
    expect(() => allowedOrigins({ VERCEL: '1', VERCEL_URL: 'evil.test/path' })).toThrow();
  });
  it('keeps local and preview origins explicit', () => {
    expect(allowedOrigins({ NODE_ENV: 'development' })).toEqual(['http://localhost:3001']);
    expect(allowedOrigins({ NODE_ENV: 'production', APP_URL: 'http://localhost:3002' })).toEqual(['http://localhost:3002']);
    expect(allowedOrigins({ NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'preview.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app' })).toEqual(['https://preview.vercel.app']);
  });
});
