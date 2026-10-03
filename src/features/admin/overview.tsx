'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Card, PageHeader, Table } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { formatCurrency } from '@/lib/format';
import { adminApi } from '@/services/api/admin.api';
import { RecordFields } from './shared';

export function AdminOverview({ metricsOnly = false }: { metricsOnly?: boolean }) {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });
  return (
    <section className="admin-overview">
      <PageHeader
        title={metricsOnly ? 'Métricas da plataforma' : 'Administração ORBITA'}
        description="Indicadores calculados pelo backend. Totais acumulados, salvo indicação de período."
      />
      {!metricsOnly && (
        <nav aria-label="Atalhos administrativos">
          <Link href="/admin/entregadores">Revisar entregadores</Link>
          {' · '}
          <Link href="/admin/entregas">Acompanhar entregas</Link>
          {' · '}
          <Link href="/admin/incidentes">Ver incidentes</Link>
        </nav>
      )}
      <Button type="button" loading={query.isFetching} onClick={() => void query.refetch()}>
        Atualizar métricas
      </Button>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Card title="Operação">
            <RecordFields
              items={[
                { label: 'Entregas concluídas', value: query.data.completed },
                {
                  label: 'Entregadores ativos com localização recente',
                  value: query.data.activeDrivers,
                },
                { label: 'Empresas ativas', value: query.data.activeBusinesses },
                {
                  label: 'Entregas no prazo',
                  value: `${(query.data.onTimeRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                },
                {
                  label: 'Aceitação de ofertas',
                  value: `${(query.data.offerAcceptanceRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                },
              ]}
            />
          </Card>
          <Card title="Financeiro das entregas concluídas">
            <RecordFields
              items={[
                { label: 'GMV logístico', value: formatCurrency(query.data.logisticsGmvCents) },
                {
                  label: 'Receita bruta logística',
                  value: formatCurrency(query.data.grossRevenueCents),
                },
                {
                  label: 'Repasses a entregadores',
                  value: formatCurrency(query.data.driverPayoutsCents),
                },
                { label: 'Margem bruta', value: formatCurrency(query.data.grossMarginCents) },
              ]}
            />
          </Card>
          <Table caption="Entregas criadas nos últimos 30 dias — agrupamento em UTC">
            <thead>
              <tr>
                <th scope="col">Data (UTC)</th>
                <th scope="col">Entregas</th>
              </tr>
            </thead>
            <tbody>
              {query.data.deliveriesPerDay.map((day) => (
                <tr key={day.day}>
                  <td>{day.day}</td>
                  <td>{day.deliveries}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {query.data.deliveriesPerDay.length === 0 && <p>Não há entregas no período.</p>}
        </>
      )}
    </section>
  );
}
