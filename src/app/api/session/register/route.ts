import { z } from 'zod';
import { backend, readBackend, errorResponse, ServerApiError } from '@/lib/server/backend';
import { readJson, requireOrigin } from '@/lib/server/request';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const data = z
      .object({
        email: z.email().max(254),
        password: z.string().min(10).max(128),
        name: z.string().min(2).max(120),
        phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
        role: z.enum(['BUSINESS_OWNER', 'DRIVER']),
      })
      .strict()
      .safeParse(await readJson(request));
    if (!data.success) throw new ServerApiError(400, 'INVALID_FORM', 'Revise os dados do cadastro.');
    const response = await backend('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data.data),
    });
    return Response.json(await readBackend(response), {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
