'use client';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader, StatusBadge } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { ExternalNavigationLinks } from '@/components/external-navigation-links';
import { formatCurrency, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { useNotify } from '@/providers/notification-provider';
import { driverKeys, useDriverInvalidation } from './queries';
import { PinForm } from './components/pin-form';

export function DriverRouteDetailPage({ id }: { id: string }) {
  const query = useQuery({ queryKey: driverKeys.route(id), queryFn: () => driverApi.route(id) });
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const mutation = useMutation({
    mutationFn: (
      action:
        | { type: 'start' }
        | { type: 'finish' }
        | { type: 'arrive'; stopId: string }
        | { type: 'pickup'; stopId: string },
    ) => {
      if (action.type === 'start') return driverApi.start(id);
      if (action.type === 'finish') return driverApi.finish(id);
      if (action.type === 'arrive') return driverApi.arrive(id, action.stopId);
      return driverApi.completePickup(id, action.stopId);
    },
    onSuccess: () => notify('Rota atualizada.', 'success'),
    onSettled: invalidate,
  });
  if (query.isPending) return <LoadingState message="Carregando rota..." />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const route = query.data;
  const next = route.stops.find((stop) => !['COMPLETED', 'SKIPPED'].includes(stop.status));
  const resolved = route.deliveries.every((delivery) =>
    ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(delivery.status),
  );
  return (
    <section className="page route-detail-page">
      <PageHeader
        title={`Rota ${route.id.slice(0, 8)}`}
        description="Siga a sequência atualizada pelo servidor. Novas entregas podem alterar as próximas paradas."
      />
      <p>
        <StatusBadge status={route.status} />
      </p>
      <dl>
        <dt>Entregas</dt>
        <dd>{route.deliveries.length}</dd>
        <dt>Distância estimada</dt>
        <dd>{formatDistance(route.estimatedDistanceMeters)}</dd>
        <dt>Duração estimada</dt>
        <dd>{formatDuration(route.estimatedDurationSeconds)}</dd>
        <dt>Repasse</dt>
        <dd>{formatCurrency(route.driverPayoutCents)}</dd>
        <dt>Início</dt>
        <dd>{route.startedAt ? formatDate(route.startedAt) : 'Não iniciada'}</dd>
        <dt>Conclusão</dt>
        <dd>{route.completedAt ? formatDate(route.completedAt) : 'Não concluída'}</dd>
      </dl>
      <div className="page-actions">
        <Button onClick={() => void query.refetch()} loading={query.isFetching}>
          Atualizar rota
        </Button>
        {route.status === 'ASSIGNED' && (
          <Button loading={mutation.isPending} onClick={() => mutation.mutate({ type: 'start' })}>
            Iniciar rota
          </Button>
        )}
        {route.status === 'ACTIVE' && !next && resolved && (
          <Button loading={mutation.isPending} onClick={() => mutation.mutate({ type: 'finish' })}>
            Finalizar rota
          </Button>
        )}
      </div>
      {mutation.isError && <ErrorState error={mutation.error} />}
      <ol className="route-stops">
        {route.stops.map((stop) => {
          const delivery = route.deliveries.find((item) => item.id === stop.deliveryId);
          const isNext = next?.id === stop.id && route.status === 'ACTIVE';
          return (
            <li key={stop.id}>
              <Card title={`${stop.sequence + 1}. ${stop.type === 'PICKUP' ? 'Coleta' : 'Entrega'}`}>
                <p>
                  <StatusBadge status={stop.status} />
                </p>
                <p>
                  <Link href={`/app/entregador/entregas/${stop.deliveryId}`}>
                    Pedido {stop.deliveryId.slice(0, 8)}
                  </Link>
                </p>
                {delivery && (
                  <>
                    <p>Cliente: {delivery.customerName}</p>
                    {stop.type === 'DROPOFF' && delivery.complement && (
                      <p>Complemento: {delivery.complement}</p>
                    )}
                    <ul>
                      {delivery.items.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          {item.quantity} × {item.name}
                        </li>
                      ))}
                    </ul>
                    {stop.type === 'PICKUP' && (
                      <p>
                        Preparação:{' '}
                        {delivery.readinessStatus === 'READY_FOR_PICKUP'
                          ? 'pronto para coleta'
                          : 'em preparação'}
                        .
                      </p>
                    )}
                  </>
                )}
                <p>
                  Previsão de chegada:{' '}
                  {stop.estimatedArrivalAt ? formatDate(stop.estimatedArrivalAt) : 'Não informada'}.
                </p>
                {stop.arrivedAt && <p>Chegada registrada: {formatDate(stop.arrivedAt)}.</p>}
                <ExternalNavigationLinks latitude={stop.latitude} longitude={stop.longitude} />
                {isNext && stop.status === 'PENDING' && (
                  <Button
                    onClick={() => mutation.mutate({ type: 'arrive', stopId: stop.id })}
                    loading={mutation.isPending}
                  >
                    Cheguei
                  </Button>
                )}
                {isNext && stop.type === 'PICKUP' && stop.status === 'ARRIVED' && (
                  <Button
                    disabled={delivery?.readinessStatus !== 'READY_FOR_PICKUP'}
                    onClick={() => mutation.mutate({ type: 'pickup', stopId: stop.id })}
                    loading={mutation.isPending}
                  >
                    Confirmar coleta
                  </Button>
                )}
                {isNext && stop.type === 'DROPOFF' && stop.status === 'ARRIVED' && (
                  <PinForm
                    deliveryId={stop.deliveryId}
                    disabled={
                      mutation.isPending ||
                      (delivery ? ['RETURN_REQUIRED', 'RETURNING'].includes(delivery.status) : true)
                    }
                  />
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
