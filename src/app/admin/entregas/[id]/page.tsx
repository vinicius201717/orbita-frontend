import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminDeliveryDetail } from '@/features/admin/deliveries';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <AdminDeliveryDetail id={id} />;
}
