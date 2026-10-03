'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader, Table } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { formatCurrency, formatDate } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { driverKeys } from './queries';
import { statusLabel } from '@/constants/status';

export function DriverEarningsPage() {
  const [walletCursors, setWalletCursors] = useState<(string | undefined)[]>([undefined]);
  const [earningCursors, setEarningCursors] = useState<(string | undefined)[]>([undefined]);
  const walletCursor = walletCursors.at(-1);
  const earningCursor = earningCursors.at(-1);
  const wallet = useQuery({
    queryKey: driverKeys.wallet(walletCursor),
    queryFn: () => driverApi.wallet(walletCursor),
  });
  const earnings = useQuery({
    queryKey: driverKeys.earnings(earningCursor),
    queryFn: () => driverApi.earnings(earningCursor),
  });
  const analytics = useQuery({ queryKey: driverKeys.analytics, queryFn: driverApi.analytics });
  return (
    <section className="page earnings-page">
      <PageHeader title="Ganhos" description="Saldo e lançamentos enviados pelo servidor, em reais." />
      <Card title="Saldo">
        {wallet.isPending ? (
          <LoadingState />
        ) : wallet.isError ? (
          <ErrorState error={wallet.error} retry={() => void wallet.refetch()} />
        ) : (
          <p>{formatCurrency(wallet.data.balanceCents)}</p>
        )}
      </Card>
      <Card title="Ganhos acumulados">
        {analytics.isPending ? (
          <LoadingState />
        ) : analytics.isError ? (
          <ErrorState error={analytics.error} retry={() => void analytics.refetch()} />
        ) : (
          <p>
            {formatCurrency(analytics.data.earningsCents)} em {analytics.data.deliveries} entrega(s)
            concluída(s).
          </p>
        )}
        <p>
          Recortes de hoje, semana e mês ainda não são fornecidos pela API. O saldo considera todos os
          lançamentos, inclusive ajustes.
        </p>
      </Card>
      <section aria-labelledby="wallet-heading">
        <h2 id="wallet-heading">Extrato</h2>
        {wallet.isPending ? (
          <LoadingState />
        ) : wallet.isError ? (
          <ErrorState error={wallet.error} />
        ) : (
          <>
            {wallet.data.entries.length === 0 ? (
              <EmptyState title="Nenhum lançamento nesta página" />
            ) : (
              <Table caption="Lançamentos da carteira">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Referência</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>{statusLabel(entry.type)}</td>
                      <td>{formatCurrency(entry.amountCents)}</td>
                      <td>{entry.ledgerTransactionId}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <nav aria-label="Páginas do extrato">
              <Button
                disabled={walletCursors.length < 2}
                onClick={() => setWalletCursors((values) => values.slice(0, -1))}
              >
                Anterior
              </Button>
              <Button
                disabled={!wallet.data.nextCursor}
                onClick={() => {
                  if (wallet.data.nextCursor)
                    setWalletCursors((values) => [...values, wallet.data.nextCursor ?? undefined]);
                }}
              >
                Próxima
              </Button>
            </nav>
          </>
        )}
      </section>
      <section aria-labelledby="earnings-heading">
        <h2 id="earnings-heading">Ganhos por entrega</h2>
        {earnings.isPending ? (
          <LoadingState />
        ) : earnings.isError ? (
          <ErrorState error={earnings.error} retry={() => void earnings.refetch()} />
        ) : (
          <>
            {earnings.data.length === 0 ? (
              <EmptyState title="Nenhum ganho nesta página" />
            ) : (
              <Table caption="Ganhos confirmados">
                <thead>
                  <tr>
                    <th>Entrega</th>
                    <th>Data</th>
                    <th>Repasse</th>
                    <th>Gorjeta</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.data.map((earning) => (
                    <tr key={earning.id}>
                      <td>
                        <Link href={`/app/entregador/entregas/${earning.deliveryId}`}>
                          {earning.deliveryId.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{formatDate(earning.createdAt)}</td>
                      <td>{formatCurrency(earning.payoutCents)}</td>
                      <td>{formatCurrency(earning.tipCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <nav aria-label="Páginas de ganhos">
              <Button
                disabled={earningCursors.length < 2}
                onClick={() => setEarningCursors((values) => values.slice(0, -1))}
              >
                Anterior
              </Button>
              <Button
                disabled={earnings.data.length < 50}
                onClick={() => {
                  const last = earnings.data.at(-1)?.id;
                  if (last) setEarningCursors((values) => [...values, last]);
                }}
              >
                Próxima
              </Button>
            </nav>
          </>
        )}
      </section>
    </section>
  );
}
