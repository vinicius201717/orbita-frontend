import { ServerApiError } from './backend';
import { sameOrigin } from './security';
import { allowedOrigins } from './origins';
export function requireOrigin(request: Request) {
  let origins: string[];
  try { origins = allowedOrigins(); }
  catch { throw new ServerApiError(503, 'ORIGIN_CONFIGURATION_INVALID', 'O acesso está temporariamente indisponível. A operação precisa revisar a configuração do site.'); }
  if (!origins.some((origin) => sameOrigin(request, origin)))
    throw new ServerApiError(403, 'CSRF_REJECTED', 'Origem da solicitação não permitida.');
}
export async function readJson(request: Request): Promise<unknown> {
  const buffer = await readBoundedBody(request, 256 * 1024);
  if (buffer.length === 0) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new ServerApiError(400, 'INVALID_JSON', 'Dados inválidos.');
  }
}
export async function readBoundedBody(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > limit)
    throw new ServerApiError(413, 'BODY_TOO_LARGE', 'Dados excedem o limite.');
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
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
  return Buffer.concat(chunks);
}
