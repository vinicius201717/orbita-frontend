import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requirePageSession } from '@/lib/server/page-access';
import { homeForRole } from '@/lib/access';
export default async function DriverLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();
  if (session.user.role !== 'DRIVER') redirect(homeForRole(session.user.role));
  return children;
}
