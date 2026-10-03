import { z } from 'zod';
import { createSession } from '@/lib/server/session';
import { errorResponse, ServerApiError } from '@/lib/server/backend';
import { readJson, requireOrigin } from '@/lib/server/request';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const parsed = z
      .object({ email: z.email().max(254), password: z.string().min(10).max(128) })
      .safeParse(await readJson(request));
    if (!parsed.success) throw new ServerApiError(400, 'INVALID_FORM', 'Revise e-mail e senha.');
    const user = await createSession(parsed.data.email, parsed.data.password);
    return Response.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
