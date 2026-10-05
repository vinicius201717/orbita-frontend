'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Button, StatusBadge } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { useBranches } from '@/features/business/queries';
import { ordersApi } from '@/services/api/orders.api';
import { formatCurrency, formatDate } from '@/lib/format';
import { orderStage, orderStageLabel } from './order-state';
import { OrderActions } from './order-actions';
import styles from './orders.module.css';

export function OrderDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  const valid = z.uuid().safeParse(id).success;
  const query = useQuery({
    queryKey: ['merchant-orders', 'detail', user?.businessId, id],
    queryFn: () => ordersApi.get(id),
    enabled: !!user?.businessId && valid,
    refetchInterval: 30000,
  });
  const branches = useBranches();
  if (!user?.businessId)
    return (
      <EmptyState title="Configure seu estabelecimento">
        <Link href="/app/onboarding">Configurar loja</Link>
      </EmptyState>
    );
  if (!valid) return <ErrorState error={new Error('Pedido inválido.')} />;
  if (query.isPending) return <LoadingState message="Carregando pedido…" />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (!query.data || query.data.businessId !== user.businessId)
    return <ErrorState error={new Error('Pedido não encontrado nesta loja.')} />;
  const order = query.data;
  const delivery = order.delivery;
  const branch = branches.data?.find((item) => item.id === order.branchId);
  const milestones = [
    ['Pedido recebido', order.createdAt],
    ['Pronto para coleta', delivery.readyAt],
    ['Coletado pelo entregador', delivery.pickedUpAt],
    ['Entregue ao cliente', delivery.deliveredAt],
  ];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>PEDIDO #{order.id.slice(0, 8)}</span>
          <h1>{order.customerName}</h1>
          <p>Recebido em {formatDate(order.createdAt)}</p>
        </div>
        <Link className={styles.quietLink} href="/app/pedidos">
          Voltar aos pedidos
        </Link>
      </header>
      <section className={styles.statusPanel}>
        <div>
          <span className={styles.badge} data-stage={orderStage(delivery)}>
            {orderStageLabel(delivery)}
          </span>
          <h2>
            {delivery.status === 'DELIVERED'
              ? 'Pedido entregue. Bom trabalho!'
              : delivery.readinessStatus === 'PREPARING' && orderStage(delivery) === 'preparing'
                ? 'Prepare o pedido e avise quando estiver pronto.'
                : orderStage(delivery) === 'ready'
                  ? 'Deixe o pedido embalado para a coleta.'
                  : 'Acompanhe as atualizações da entrega.'}
          </h2>
          <p>
            {delivery.driverId
              ? 'Um entregador está vinculado a esta entrega.'
              : ['CANCELLED', 'FAILED', 'RETURNED'].includes(delivery.status)
                ? 'Consulte os detalhes abaixo.'
                : 'A ORBITA está buscando um entregador disponível para esta operação.'}
          </p>
        </div>
        <OrderActions delivery={delivery} />
      </section>
      <div className={styles.composer}>
        <div className={styles.sections}>
          <section className={styles.panel}>
            <h2>Itens para preparar</h2>
            <ul className={styles.reviewItems}>
              {order.items.map((item) => (
                <li key={item.productId}>
                  <div>
                    <strong>
                      {item.quantity} × {item.name}
                    </strong>
                    <span>{formatCurrency(item.unitPriceCents)} por unidade</span>
                  </div>
                  <strong>{formatCurrency(item.totalCents)}</strong>
                </li>
              ))}
            </ul>
            {order.notes && (
              <div className={styles.notice}>
                <strong>Observações para o preparo</strong>
                <p>{order.notes}</p>
              </div>
            )}
            <div className={styles.total}>
              <span>Total dos produtos</span>
              <strong>{formatCurrency(order.totalCents)}</strong>
            </div>
            <p className={styles.note}>
              Preços registrados no momento do pedido. Frete separado. Este painel não realiza cobrança
              do cliente.
            </p>
          </section>
          <section className={styles.panel}>
            <h2>Cliente e destino</h2>
            <dl className={styles.details}>
              <dt>Cliente</dt>
              <dd>{order.customerName}</dd>
              <dt>Telefone</dt>
              <dd>
                {order.customerPhone ? (
                  <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
                ) : (
                  'Não informado'
                )}
              </dd>
              <dt>Endereço e referência</dt>
              <dd>{delivery.complement || order.address}</dd>
              <dt>Unidade de coleta</dt>
              <dd>{branch?.name || 'Unidade cadastrada'}</dd>
            </dl>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${delivery.dropoffLatitude},${delivery.dropoffLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Conferir destino no mapa ↗
            </a>
          </section>
        </div>
        <aside className={styles.sections}>
          <section className={styles.panel}>
            <h2>Acompanhamento</h2>
            <ol className={styles.timeline}>
              {milestones.map(([label, date]) => (
                <li key={label} data-complete={!!date}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <div>
                    <strong>{label}</strong>
                    <small>{date ? formatDate(date) : 'Aguardando esta etapa'}</small>
                  </div>
                </li>
              ))}
            </ol>
            {delivery.cancellationReason && (
              <p className={styles.notice}>Motivo: {delivery.cancellationReason}</p>
            )}
            <Button loading={query.isRefetching} onClick={() => void query.refetch()}>
              Atualizar acompanhamento
            </Button>
          </section>
          <section className={styles.panel}>
            <h2>Entrega ORBITA</h2>
            <dl className={styles.details}>
              <dt>Distribuição</dt>
              <dd>
                <StatusBadge status={delivery.status} />
              </dd>
              <dt>Modalidade</dt>
              <dd>
                <StatusBadge status={delivery.serviceLevel} />
              </dd>
              <dt>Custo da entrega</dt>
              <dd>{formatCurrency(delivery.revenueCents)}</dd>
            </dl>
            <Link className={styles.detailLink} href={`/app/entregas/${delivery.id}`}>
              Ver rota, código do cliente e detalhes ↗
            </Link>
            <p className={styles.note}>
              O código de recebimento deve ser entregue apenas ao cliente. Consulte as opções na página
              da entrega.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
