type OriginEnvironment = Partial<Pick<NodeJS.ProcessEnv, 'APP_URL' | 'NODE_ENV' | 'VERCEL' | 'VERCEL_URL' | 'VERCEL_BRANCH_URL' | 'VERCEL_PROJECT_PRODUCTION_URL' | 'VERCEL_ENV'>>;

/** Only server-owned configuration can authorize an origin; never trust Host/X-Forwarded-Host. */
export function allowedOrigins(env: OriginEnvironment = process.env): string[] {
  const values: string[] = [];
  if (env.APP_URL) values.push(env.APP_URL);
  if (env.VERCEL === '1') {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL,
      ...(env.VERCEL_ENV === 'production' ? [env.VERCEL_PROJECT_PRODUCTION_URL] : [])]) {
      if (!host) continue;
      if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)) throw new Error('Invalid deployment origin');
      values.push(`https://${host}`);
    }
  }
  if (!values.length && env.NODE_ENV !== 'production') values.push('http://localhost:3001');
  if (!values.length) throw new Error('APP_URL is required outside Vercel');
  return [...new Set(values.map((value) => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL must be an origin');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((env.VERCEL === '1' || !local) && url.protocol !== 'https:') throw new Error('Public origins require HTTPS');
    return url.origin;
  }))];
}
