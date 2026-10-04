export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente.',
  INVALID_REFRESH: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Seu perfil não permite esta operação.',
  HTTP_403: 'Acesso não permitido.',
  PIN_INVALID: 'Código incorreto. Confira com o cliente.',
  PIN_LOCKED: 'Limite de tentativas atingido. Solicite orientação da operação.',
  OFFER_EXPIRED: 'Esta oferta expirou. Atualize a lista.',
  OFFER_STALE: 'A rota mudou. Atualize as ofertas.',
  CONFLICT: 'A operação conflita com o estado atual. Atualize os dados.',
  IDENTITY_ENDPOINT_MISSING:
    'A identificação da sessão depende de uma API ainda não disponível. Consulte as pendências de integração.',
  RATE_LIMITED: 'Muitas solicitações. Aguarde um momento.',
  NETWORK_ERROR: 'Não foi possível conectar. Tente novamente.',
  BACKEND_UNAVAILABLE: 'O serviço está indisponível no momento.',
};
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 0, messages.NETWORK_ERROR);
  }
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const data = body as { code?: string; message?: string | string[] } | null;
    const code = data?.code ?? 'HTTP_' + response.status;
    if (response.status === 401 && typeof window !== 'undefined')
      window.dispatchEvent(new Event('orbita:session-expired'));
    throw new ApiError(
      code,
      response.status,
      messages[code] ??
        (typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join('; ')
            : 'Não foi possível concluir a operação.'),
      body,
    );
  }
  return body as T;
}
const base = process.env.NEXT_PUBLIC_API_URL || '/api/backend';
function url(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {}))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return base + path + (params.size ? '?' + params.toString() : '');
}
export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    requestJson<T>(url(path, query)),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    requestJson<T>(url(path), {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
    }),
  patch: <T>(path: string, body?: unknown) =>
    requestJson<T>(url(path), { method: 'PATCH', body: JSON.stringify(body) }),
};
