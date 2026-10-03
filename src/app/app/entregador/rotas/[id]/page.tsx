import { DriverRouteDetailPage } from '@/features/driver/route-detail-page';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverRouteDetailPage id={id} />;
}
