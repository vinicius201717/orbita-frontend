'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader, StatusBadge, Table } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ExternalNavigationLinks } from '@/components/external-navigation-links';
import { formatCurrency, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { statusLabel } from '@/constants/status';
import { adminApi } from '@/services/api/admin.api';
import { AdminRecordList, EntityLink, RecordFields } from './shared';
import type { AdminRoute } from './types';

export function AdminRoutes() {
  return (
    <AdminRecordList<AdminRoute>
      title="Rotas"
      resource="routes"
      description="Consulta das rotas da plataforma. A execução das paradas é exclusiva do entregador responsável."
      columns={[
        { title: 'Rota', render: (route) => <EntityLink kind="rotas" id={route.id} /> },
        {
          title: 'Entregador',
          render: (route) => <EntityLink kind="entregadores" id={route.driverId} />,
        },
        { title: 'Status', render: (route) => <StatusBadge status={route.status} /> },
        {
          title: 'Distância estimada',
          render: (route) => formatDistance(route.estimatedDistanceMeters),
        },
        { title: 'Duração estimada', render: (route) => formatDuration(route.estimatedDurationSeconds) },
        { title: 'Repasse', render: (route) => formatCurrency(route.driverPayoutCents) },
        { title: 'Criada em', render: (route) => formatDate(route.createdAt) },
      ]}
    />
  );
}

export function AdminRouteDetail({ id }: { id: string }) {
  const query = useQuery({ queryKey: ['admin', 'route', id], queryFn: () => adminApi.route(id) });
  return (
    <section className="admin-route-detail">
      <PageHeader title="Detalhes da rota">
        <Link href="/admin/rotas">Voltar para rotas</Link>
      </PageHeader>
      <Button loading={query.isFetching} onClick={() => void query.refetch()}>
        Atualizar rota
      </Button>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Card title={`Rota ${query.data.id.slice(0, 8)}`}>
            <RecordFields
              items={[
                { label: 'ID', value: query.data.id },
                { label: 'Status', value: <StatusBadge status={query.data.status} /> },
                {
                  label: 'Entregador',
                  value: <EntityLink kind="entregadores" id={query.data.driverId} />,
                },
                { label: 'Entregas vinculadas', value: query.data.deliveries?.length ?? 0 },
                {
                  label: 'Distância estimada',
                  value: formatDistance(query.data.estimatedDistanceMeters),
                },
                {
                  label: 'Duração estimada',
                  value: formatDuration(query.data.estimatedDurationSeconds),
                },
                { label: 'Valor bruto', value: formatCurrency(query.data.grossValueCents) },
                { label: 'Repasse', value: formatCurrency(query.data.driverPayoutCents) },
                { label: 'Margem', value: formatCurrency(query.data.platformMarginCents) },
                { label: 'Iniciada em', value: formatDate(query.data.startedAt) },
                { label: 'Finalizada em', value: formatDate(query.data.completedAt) },
                { label: 'Versão', value: query.data.version },
              ]}
            />
          </Card>
          <section aria-labelledby="admin-route-stops">
            <h2 id="admin-route-stops">Sequência das paradas</h2>
            {!query.data.stops?.length ? (
              <EmptyState title="Nenhuma parada registrada" />
            ) : (
              <Table caption="Paradas na sequência retornada pelo backend">
                <thead>
                  <tr>
                    <th scope="col">Sequência</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Entrega</th>
                    <th scope="col">Status</th>
                    <th scope="col">Previsão</th>
                    <th scope="col">Chegada</th>
                    <th scope="col">Conclusão</th>
                    <th scope="col">Navegação</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.stops.map((stop) => (
                    <tr key={stop.id}>
                      <td>{stop.sequence}</td>
                      <td>{statusLabel(stop.type)}</td>
                      <td>
                        <EntityLink kind="entregas" id={stop.deliveryId} />
                      </td>
                      <td>
                        <StatusBadge status={stop.status} />
                      </td>
                      <td>{formatDate(stop.estimatedArrivalAt)}</td>
                      <td>{formatDate(stop.arrivedAt)}</td>
                      <td>{formatDate(stop.completedAt)}</td>
                      <td>
                        <ExternalNavigationLinks latitude={stop.latitude} longitude={stop.longitude} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
          <section aria-labelledby="admin-route-deliveries">
            <h2 id="admin-route-deliveries">Entregas</h2>
            {!query.data.deliveries?.length ? (
              <EmptyState title="Nenhuma entrega vinculada" />
            ) : (
              <Table caption="Entregas da rota">
                <thead>
                  <tr>
                    <th scope="col">Entrega</th>
                    <th scope="col">Empresa</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Status</th>
                    <th scope="col">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>
                        <EntityLink kind="entregas" id={delivery.id} />
                      </td>
                      <td>
                        <EntityLink kind="empresas" id={delivery.businessId} />
                      </td>
                      <td>{delivery.customerName}</td>
                      <td>
                        <StatusBadge status={delivery.status} />
                      </td>
                      <td>{formatDate(delivery.deliveryDeadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </>
      )}
    </section>
  );
}
