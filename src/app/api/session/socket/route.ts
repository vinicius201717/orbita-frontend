import { requireSession } from '@/lib/server/session';
import { errorResponse } from '@/lib/server/backend';
export async function GET() {
  try {
    const session = await requireSession();
    return Response.json(
      { accessToken: session.accessToken, expiresAt: session.expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
