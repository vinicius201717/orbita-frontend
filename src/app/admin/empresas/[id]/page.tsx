import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminBusinessDetail } from '@/features/admin/businesses';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <AdminBusinessDetail id={id} />;
}
