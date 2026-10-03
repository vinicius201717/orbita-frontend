import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requirePageSession } from '@/lib/server/page-access';
import { homeForRole } from '@/lib/access';
export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();
  if (!['BUSINESS_OWNER', 'BUSINESS_STAFF'].includes(session.user.role))
    redirect(homeForRole(session.user.role));
  return children;
}
