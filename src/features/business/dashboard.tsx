'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Card, StatusBadge } from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { deliveryApi } from '@/services/api/delivery.api';
import { formatCurrency, formatDuration } from '@/lib/format';
import { useBusinessOverview } from './queries';
import type { BusinessOverview } from './types';
export function BusinessSummary({ data }: { data: BusinessOverview }) {
  return (
    <dl className="business-summary">
      <dt>Entregas registradas</dt>
      <dd>{data.deliveries}</dd>
      <dt>Concluídas</dt>
      <dd>{data.completed}</dd>
      <dt>Canceladas</dt>
      <dd>{data.cancelled}</dd>
      <dt>Tempo médio das concluídas</dt>
      <dd>{data.completed ? formatDuration(data.averageDeliverySeconds) : 'Sem entregas concluídas'}</dd>
      <dt>Custo médio das concluídas</dt>
      <dd>{data.completed ? formatCurrency(data.averageCostCents) : 'Sem entregas concluídas'}</dd>
      <dt>Concluídas no prazo</dt>
      <dd>
        {data.completed
          ? new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(
              data.onTimeRate,
            )
          : 'Sem entregas concluídas'}
      </dd>
    </dl>
  );
}
export function BusinessDashboard() {
  const { user } = useAuth();
  const overview = useBusinessOverview();
  const deliveries = useQuery({
    queryKey: ['deliveries', 'business-dashboard', user?.businessId],
    queryFn: () => deliveryApi.list({ limit: 10 }),
    enabled: !!user?.businessId,
  });
  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Acompanhe os dados da sua empresa e acesse a operação."
      >
        <Link href="/app/entregas/nova">Nova entrega</Link>
        {' · '}
        <Link href="/app/onboarding">Configuração inicial</Link>
      </PageHeader>
      {!user?.businessId ? (
        <EmptyState
          title="Cadastre sua empresa"
          description="Complete a configuração para iniciar a operação."
        >
          <Link href="/app/onboarding">Continuar configuração</Link>
        </EmptyState>
      ) : (
        <>
          <Card title="Resumo da empresa">
            <p>Dados de todo o período, calculados pelo backend.</p>
            {overview.isPending ? (
              <LoadingState />
            ) : overview.error ? (
              <ErrorState error={overview.error} retry={() => void overview.refetch()} />
            ) : (
              overview.data && <BusinessSummary data={overview.data} />
            )}
          </Card>
          <Card title="Entregas">
            <p>
              Primeiras 10 entregas na ordem de paginação da API. Use os filtros da lista para acompanhar
              a operação.
            </p>
            {deliveries.isPending ? (
              <LoadingState />
            ) : deliveries.error ? (
              <ErrorState error={deliveries.error} retry={() => void deliveries.refetch()} />
            ) : deliveries.data?.items.length ? (
              <ul>
                {deliveries.data.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/app/entregas/${item.id}`}>
                      {item.id.slice(0, 8)} — {item.customerName}
                    </Link>{' '}
                    <StatusBadge status={item.status} /> <StatusBadge status={item.readinessStatus} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma entrega registrada" />
            )}
            <Link href="/app/entregas">Ver todas as entregas e filtrar</Link>
          </Card>
        </>
      )}
      <nav aria-label="Atalhos da empresa">
        <ul>
          <li>
            <Link href="/app/unidades">Unidades</Link>
          </li>
          <li>
            <Link href="/app/financeiro">Financeiro</Link>
          </li>
          <li>
            <Link href="/app/analytics">Analytics</Link>
          </li>
          <li>
            <Link href="/app/perfil">Perfil</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
export function BusinessAnalytics() {
  const { user } = useAuth();
  const query = useBusinessOverview();
  return (
    <>
      <PageHeader title="Analytics" description="Indicadores de todo o período, calculados pela API." />
      {!user?.businessId ? (
        <EmptyState title="Empresa não cadastrada">
          <Link href="/app/onboarding">Concluir configuração</Link>
        </EmptyState>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && <BusinessSummary data={query.data} />
      )}
    </>
  );
}
