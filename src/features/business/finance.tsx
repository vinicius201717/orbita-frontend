'use client';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PageHeader, Button, Table, StatusBadge } from '@/components/ui';
import { ErrorState, LoadingState, EmptyState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { businessApi } from '@/services/api/business.api';
import { formatCurrency, formatDate } from '@/lib/format';
export function BusinessFinance() {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['business', 'billing', user?.businessId],
    queryFn: ({ pageParam }) => businessApi.billing(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!user?.businessId,
  });
  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  return (
    <>
      <PageHeader title="Financeiro" description="Saldo e lançamentos registrados pelo backend." />
      {!user?.businessId ? (
        <EmptyState title="Cadastre sua empresa">
          <Link href="/app/onboarding">Configuração inicial</Link>
        </EmptyState>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <dl>
            <dt>Saldo contábil informado pela API</dt>
            <dd>{formatCurrency(query.data?.pages[0].balanceCents ?? 0)}</dd>
          </dl>
          <p>
            Valores em reais. Cobranças reduzem o saldo contábil. Esta tela não realiza pagamentos ou
            recargas.
          </p>
          {entries.length ? (
            <Table caption="Lançamentos financeiros">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Transação</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <StatusBadge status={entry.type} />
                    </td>
                    <td>{formatCurrency(entry.amountCents)}</td>
                    <td>{entry.ledgerTransactionId}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="Nenhum lançamento registrado" />
          )}
          {query.error && <ErrorState error={query.error} retry={() => void query.fetchNextPage()} />}
          <Button onClick={() => void query.refetch()} loading={query.isRefetching}>
            Atualizar saldo e lançamentos
          </Button>
          {query.hasNextPage && (
            <Button onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
              Carregar mais lançamentos
            </Button>
          )}
        </>
      )}
    </>
  );
}
