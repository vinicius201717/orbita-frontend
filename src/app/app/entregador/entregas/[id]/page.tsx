import { DriverDeliveryDetailPage } from '@/features/driver/delivery-detail-page';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverDeliveryDetailPage id={id} />;
}
