import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export function sameOrigin(request: Request, appUrl: string) {
  return request.headers.get('origin') === new URL(appUrl).origin;
}
export function encryptSession(value: unknown, key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error('SESSION_ENCRYPTION_KEY must have 64 hexadecimal characters');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function decryptSession(value: string, key: string): unknown {
  const bytes = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
  );
}
