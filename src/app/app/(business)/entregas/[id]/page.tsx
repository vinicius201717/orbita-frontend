import { DeliveryDetailPage } from '@/features/deliveries/detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeliveryDetailPage key={id} id={id} />;
}
