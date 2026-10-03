import type { ReactNode } from 'react';
import { requirePageSession } from '@/lib/server/page-access';
import { DashboardShell } from '@/components/layout/dashboard-shell';
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requirePageSession();
  return <DashboardShell>{children}</DashboardShell>;
}
