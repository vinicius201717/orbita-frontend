import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './session';
export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
