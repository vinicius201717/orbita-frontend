import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminDriverDetail } from '@/features/admin/drivers';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const cursor =
    typeof search.cursor === 'string' && z.uuid().safeParse(search.cursor).success
      ? search.cursor
      : undefined;
  return <AdminDriverDetail id={id} cursor={cursor} />;
}
