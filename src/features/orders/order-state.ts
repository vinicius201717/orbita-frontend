import type { Delivery } from '@/features/deliveries/types';

export const orderStages = [
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Prontos para coleta' },
  { value: 'on-the-way', label: 'A caminho' },
  { value: 'completed', label: 'Entregues' },
  { value: 'attention', label: 'Precisam de atenção' },
  { value: 'cancelled', label: 'Cancelados' },
] as const;
export type OrderStage = (typeof orderStages)[number]['value'];

export function orderStage(delivery: Pick<Delivery, 'status' | 'readinessStatus'>): OrderStage {
  if (delivery.status === 'DELIVERED') return 'completed';
  if (delivery.status === 'CANCELLED' || delivery.status === 'RETURNED') return 'cancelled';
  if (['FAILED', 'RETURN_REQUIRED', 'RETURNING'].includes(delivery.status)) return 'attention';
  if (['PICKED_UP', 'IN_TRANSIT', 'ARRIVING'].includes(delivery.status)) return 'on-the-way';
  return delivery.readinessStatus === 'READY_FOR_PICKUP' ? 'ready' : 'preparing';
}

export function orderStageLabel(delivery: Pick<Delivery, 'status' | 'readinessStatus'>) {
  if (delivery.status === 'RETURNED') return 'Devolvido';
  if (delivery.status === 'RETURNING' || delivery.status === 'RETURN_REQUIRED') return 'Em devolução';
  if (delivery.status === 'FAILED') return 'Precisa de atenção';
  if (delivery.status === 'ARRIVING') return 'Chegando ao cliente';
  const labels: Record<OrderStage, string> = {
    preparing: 'Em preparo',
    ready: 'Pronto para coleta',
    'on-the-way': 'A caminho',
    completed: 'Entregue',
    attention: 'Precisa de atenção',
    cancelled: 'Cancelado',
  };
  return labels[orderStage(delivery)];
}

export function canMarkOrderReady(delivery: Pick<Delivery, 'status' | 'readinessStatus'>) {
  return (
    delivery.readinessStatus === 'PREPARING' &&
    ['WAITING_POOL', 'MATCHING', 'OFFERED', 'ASSIGNED', 'PICKUP_PENDING'].includes(delivery.status)
  );
}

export function canCancelOrder(delivery: Pick<Delivery, 'status'>) {
  return !['DELIVERED', 'RETURNED', 'CANCELLED', 'RETURN_REQUIRED', 'RETURNING'].includes(
    delivery.status,
  );
}

export const serviceOptions = [
  {
    value: 'SMART',
    name: 'Inteligente',
    description: 'Equilíbrio entre agilidade e aproveitamento das rotas.',
  },
  { value: 'ECONOMY', name: 'Econômica', description: 'Mais tempo para combinar entregas próximas.' },
  { value: 'EXPRESS', name: 'Expressa', description: 'Prioridade na busca de entregador.' },
] as const;
