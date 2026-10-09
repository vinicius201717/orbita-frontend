'use client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { formatCurrency } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { driverKeys } from '../queries';

export function DriverTodaySummary() {
  const query = useQuery({ queryKey: driverKeys.summary, queryFn: driverApi.summary, refetchInterval: 30000 });
  return <Card title="Seu dia">
    {query.isPending ? <LoadingState /> : query.error ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <>
      <dl><dt>Ganhos de hoje</dt><dd>{formatCurrency(query.data.today.earningsCents)}</dd>
        <dt>Entregas concluídas hoje</dt><dd>{query.data.today.completedDeliveries}</dd></dl>
      <p>Dia {query.data.today.date.split('-').reverse().join('/')} no horário de Brasília. Inclui repasses e gorjetas já lançados.</p>
    </>}
  </Card>;
}
