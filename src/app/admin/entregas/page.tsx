import { AdminDeliveries } from '@/features/admin/deliveries';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[]; driverId?: string | string[] }>;
}) {
  const search = await searchParams;
  return (
    <AdminDeliveries
      initialBusinessId={typeof search.businessId === 'string' ? search.businessId : undefined}
      initialDriverId={typeof search.driverId === 'string' ? search.driverId : undefined}
    />
  );
}
