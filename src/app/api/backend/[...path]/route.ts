import { backend, errorResponse, ServerApiError } from '@/lib/server/backend';
import { requireSession, getSession } from '@/lib/server/session';
import { allowedEndpoint } from '@/lib/server/allowlist';
import { readJson, readBoundedBody, requireOrigin } from '@/lib/server/request';
type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, { params }: Context) {
  try {
    const path = '/' + (await params).path.join('/');
    if (!allowedEndpoint(path, request.method))
      throw new ServerApiError(404, 'NOT_FOUND', 'Operação não disponível.');
    if (request.method !== 'GET') requireOrigin(request);
    let session = await requireSession();
    const idempotency = request.headers.get('idempotency-key');
    const headers: Record<string, string> = {};
    const upload = path === '/documents' && request.method === 'POST';
    let body: BodyInit | undefined;
    if (upload) {
      const contentType = request.headers.get('content-type') || '';
      if (!/^multipart\/form-data;\s*boundary=/i.test(contentType))
        throw new ServerApiError(415, 'INVALID_DOCUMENT', 'Envie o arquivo como formulário multipart.');
      headers['Content-Type'] = contentType;
      body = new Uint8Array(await readBoundedBody(request, 5 * 1024 * 1024 + 16 * 1024));
    } else if (request.method !== 'GET') body = JSON.stringify(await readJson(request));
    if (idempotency && /^[\w.-]{8,100}$/.test(idempotency)) headers['Idempotency-Key'] = idempotency;
    const url = path + new URL(request.url).search;
    const init = { method: request.method, body, headers };
    let response = await backend(url, init, session.accessToken);
    if (response.status === 401) {
      const renewed = await getSession(true, session.accessToken);
      if (!renewed) throw new ServerApiError(401, 'UNAUTHORIZED', 'Sessão expirada.');
      session = renewed;
      response = await backend(url, init, session.accessToken);
    }
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(response.headers.has('content-disposition')
          ? { 'Content-Disposition': response.headers.get('content-disposition')! }
          : {}),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
