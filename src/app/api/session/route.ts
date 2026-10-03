import { requireSession, updateIdentity } from '@/lib/server/session';
import { errorResponse } from '@/lib/server/backend';
export async function GET() {
  try {
    const session = await requireSession();
    return Response.json(
      { user: await updateIdentity(session) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
