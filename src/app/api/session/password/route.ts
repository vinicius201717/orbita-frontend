import { z } from 'zod';
import { backend, readBackend, errorResponse, ServerApiError } from '@/lib/server/backend';
import { endSession, requireSession } from '@/lib/server/session';
import { readJson, requireOrigin } from '@/lib/server/request';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const body = z.object({ currentPassword: z.string().min(10).max(128), newPassword: z.string().min(10).max(128) }).strict().safeParse(await readJson(request));
    if (!body.success) throw new ServerApiError(400, 'INVALID_FORM', 'Confira as senhas informadas.');
    const session = await requireSession();
    await readBackend(await backend('/auth/change-password', { method: 'POST', body: JSON.stringify(body.data) }, session.accessToken));
    await endSession();
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
