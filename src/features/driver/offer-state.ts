/** Countdown is advisory; the backend remains authoritative at acceptance. */
export function secondsUntilExpiry(expiresAt: string, now: number): number {
  const milliseconds = Date.parse(expiresAt) - now;
  return Number.isFinite(milliseconds) ? Math.max(0, Math.ceil(milliseconds / 1000)) : 0;
}
