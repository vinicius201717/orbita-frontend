'use client';
import Link from 'next/link';
import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { Button, Card, PageHeader, StatusBadge } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState, UnavailableFeature } from '@/components/feedback';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { driverKeys, useDriver } from './queries';

export function DriverRoutesPage() {
  const driver = useDriver();
  const deliveries = useInfiniteQuery({
    queryKey: driverKeys.routeHistory,
    queryFn: ({ pageParam }) => driverApi.deliveries(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const routeIds = Array.from(
    new Set(
      [
        driver.data?.currentRouteId,
        ...(deliveries.data?.pages.flatMap((page) => page.items.map((delivery) => delivery.routeId)) ??
          []),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const routes = useQueries({
    queries: routeIds.map((id) => ({
      queryKey: driverKeys.route(id),
      queryFn: () => driverApi.route(id),
    })),
  });
  return (
    <section className="page routes-page">
      <PageHeader title="Minhas rotas" />
      {driver.isPending ? (
        <LoadingState />
      ) : driver.isError ? (
        <ErrorState error={driver.error} retry={() => void driver.refetch()} />
      ) : (
        <Card title="Rota atual">
          {driver.data.currentRouteId ? (
            <Link href={`/app/entregador/rotas/${driver.data.currentRouteId}`}>
              Abrir rota {driver.data.currentRouteId.slice(0, 8)}
            </Link>
          ) : (
            <p>Nenhuma rota atribuída no momento.</p>
          )}
        </Card>
      )}
      <UnavailableFeature
        title="Próximas rotas"
        description="A API opera com uma rota atribuída por entregador e não fornece uma lista de próximas rotas. Novas oportunidades aparecem em Ofertas."
      />
      <section aria-labelledby="route-history-title">
        <h2 id="route-history-title">Rotas encontradas nas entregas carregadas</h2>
        <p>
          O histórico é obtido pelos identificadores das suas entregas. Rotas sem entregas vinculadas não
          aparecem, pois ainda não existe um endpoint de listagem de rotas para o entregador.
        </p>
        {deliveries.isPending ? (
          <LoadingState />
        ) : deliveries.isError ? (
          <ErrorState error={deliveries.error} retry={() => void deliveries.refetch()} />
        ) : routeIds.length === 0 ? (
          <EmptyState title="Nenhuma rota encontrada" />
        ) : (
          routes.map((query, index) =>
            query.isPending ? (
              <LoadingState key={routeIds[index]} />
            ) : query.isError ? (
              <ErrorState key={routeIds[index]} error={query.error} retry={() => void query.refetch()} />
            ) : (
              <Card key={query.data.id} title={`Rota ${query.data.id.slice(0, 8)}`}>
                <p>
                  <StatusBadge status={query.data.status} />
                </p>
                <p>
                  {query.data.deliveries.length} entrega(s),{' '}
                  {formatDistance(query.data.estimatedDistanceMeters)},{' '}
                  {formatDuration(query.data.estimatedDurationSeconds)}, repasse de{' '}
                  {formatCurrency(query.data.driverPayoutCents)}.
                </p>
                <Link href={`/app/entregador/rotas/${query.data.id}`}>Abrir rota</Link>
              </Card>
            ),
          )
        )}
        {deliveries.hasNextPage && (
          <Button
            onClick={() => void deliveries.fetchNextPage()}
            loading={deliveries.isFetchingNextPage}
          >
            Carregar mais entregas e rotas
          </Button>
        )}
      </section>
    </section>
  );
}
