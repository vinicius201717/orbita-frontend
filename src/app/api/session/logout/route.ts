import { endSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/request';
import { errorResponse } from '@/lib/server/backend';
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    await endSession();
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
