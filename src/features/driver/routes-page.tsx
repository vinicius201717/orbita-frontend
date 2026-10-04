'use client';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader, StatusBadge } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { driverKeys, useDriver } from './queries';

export function DriverRoutesPage() {
  const driver = useDriver();
  const routes = useInfiniteQuery({
    queryKey: driverKeys.routeHistory,
    queryFn: ({ pageParam }) => driverApi.routes(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = routes.data?.pages.flatMap((page) => page.items) ?? [];
  return <section className="page routes-page">
    <PageHeader title="Minhas rotas" description="Histórico completo das rotas atribuídas a você, das mais recentes às mais antigas." />
    {driver.isPending ? <LoadingState /> : driver.isError ? <ErrorState error={driver.error} retry={() => void driver.refetch()} /> :
      <Card title="Rota atual">{driver.data.currentRouteId ? <Link href={`/app/entregador/rotas/${driver.data.currentRouteId}`}>Abrir rota {driver.data.currentRouteId.slice(0, 8)}</Link> : <p>Nenhuma rota atribuída no momento. <Link href="/app/entregador/ofertas">Consultar ofertas</Link></p>}</Card>}
    <section aria-labelledby="route-history-title"><h2 id="route-history-title">Histórico de rotas</h2>
      {routes.isPending ? <LoadingState /> : routes.isError ? <ErrorState error={routes.error} retry={() => void routes.refetch()} /> : !items.length ? <EmptyState title="Nenhuma rota encontrada" /> : items.map((route) =>
        <Card key={route.id} title={`Rota ${route.id.slice(0, 8)}`}>
          <StatusBadge status={route.status} />
          <p>{route.deliveries.length} entrega(s), {formatDistance(route.estimatedDistanceMeters)}, {formatDuration(route.estimatedDurationSeconds)}, repasse de {formatCurrency(route.driverPayoutCents)}.</p>
          <Link href={`/app/entregador/rotas/${route.id}`}>Abrir rota</Link>
        </Card>)}
      {routes.hasNextPage && <Button onClick={() => void routes.fetchNextPage()} loading={routes.isFetchingNextPage}>Carregar mais rotas</Button>}
    </section>
  </section>;
}
