import 'server-only';
export class ServerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function backendBase() {
  const value = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid BACKEND_API_URL');
  return value.replace(/\/$/, '');
}
export async function backend(path: string, init: RequestInit = {}, token?: string) {
  try {
    return await fetch(backendBase() + path, {
      ...init,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ServerApiError(
      503,
      'BACKEND_UNAVAILABLE',
      'O backend está indisponível. Tente novamente.',
    );
  }
}
export async function readBackend<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const data = body as { code?: string; message?: string | string[] } | null;
    throw new ServerApiError(
      response.status,
      data?.code || 'BACKEND_ERROR',
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join('; ')
          : 'Não foi possível concluir a operação.',
    );
  }
  return body as T;
}
export function errorResponse(error: unknown) {
  if (error instanceof ServerApiError)
    return Response.json(
      { code: error.code, message: error.message, statusCode: error.status },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  return Response.json(
    { code: 'SERVER_ERROR', message: 'Não foi possível concluir a operação.', statusCode: 500 },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
