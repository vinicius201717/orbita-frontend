import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requirePageSession } from '@/lib/server/page-access';
import { homeForRole } from '@/lib/access';
import { DashboardShell } from '@/components/layout/dashboard-shell';
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();
  if (session.user.role !== 'ADMIN') redirect(homeForRole(session.user.role));
  return <DashboardShell>{children}</DashboardShell>;
}
