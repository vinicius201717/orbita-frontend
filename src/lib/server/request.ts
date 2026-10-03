import { ServerApiError } from './backend';
import { sameOrigin } from './security';
export function requireOrigin(request: Request) {
  if (!sameOrigin(request, process.env.APP_URL || 'http://localhost:3001'))
    throw new ServerApiError(403, 'CSRF_REJECTED', 'Origem da solicitação não permitida.');
}
export async function readJson(request: Request): Promise<unknown> {
  const limit = 256 * 1024;
  if (Number(request.headers.get('content-length')) > limit)
    throw new ServerApiError(413, 'BODY_TOO_LARGE', 'Dados excedem o limite.');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new ServerApiError(413, 'BODY_TOO_LARGE', 'Dados excedem o limite.');
    }
    chunks.push(value);
  }
  // Next may expose a readable but empty body for POST actions such as ready/accept/start.
  if (total === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ServerApiError(400, 'INVALID_JSON', 'Dados inválidos.');
  }
}
