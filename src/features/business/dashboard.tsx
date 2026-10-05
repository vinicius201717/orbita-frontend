'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, StatusBadge } from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { ordersApi } from '@/services/api/orders.api';
import styles from './merchant-dashboard.module.css';
import { formatCurrency, formatDuration } from '@/lib/format';
import { useBusinessOverview, useBusiness, useBranches } from './queries';
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
  const business = useBusiness();
  const branches = useBranches();
  const summary = useQuery({
    queryKey: ['merchant-orders', 'summary', user?.businessId],
    queryFn: ordersApi.summary,
    enabled: !!user?.businessId,
    refetchInterval: 30000,
  });
  const recent = useQuery({
    queryKey: ['merchant-orders', 'recent', user?.businessId],
    queryFn: () => ordersApi.list({ limit: 6 }),
    enabled: !!user?.businessId,
    refetchInterval: 30000,
  });
  const data = summary.data;
  const activeBranches = branches.data?.filter((branch) => branch.active) ?? [];
  const configured =
    !!user?.businessId && activeBranches.length > 0 && (data?.availableProductCount ?? 0) > 0;
  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SEU ESTABELECIMENTO, EM MOVIMENTO</span>
          <h1>{business.data?.tradeName || 'Seu painel de pedidos'}</h1>
          <p>Tudo o que você precisa para vender, preparar e enviar.</p>
        </div>
        <Link href="/app/pedidos/novo" className={styles.primary}>
          + Novo pedido
        </Link>
      </header>
      {!user?.businessId ? (
        <EmptyState
          title="Vamos preparar sua loja?"
          description="Cadastre seu estabelecimento e a unidade de coleta. Depois, adicione seus produtos e comece a enviar."
        >
          <Link href="/app/onboarding" className={styles.primary}>
            Configurar meu estabelecimento
          </Link>
        </EmptyState>
      ) : (
        <>
          {summary.isPending ? (
            <LoadingState message="Carregando a operação da sua loja…" />
          ) : summary.error ? (
            <ErrorState error={summary.error} retry={() => void summary.refetch()} />
          ) : (
            data && (
              <>
                <section className={styles.metrics} aria-label="Resumo da operação">
                  {[
                    ['Em preparo', data.preparing, 'Pedidos sendo preparados', 'preparing'],
                    ['Prontos para sair', data.ready, 'Aguardando a coleta', 'ready'],
                    ['A caminho', data.onTheWay, 'Com os entregadores', 'transit'],
                    ['Entregues hoje', data.completedToday, 'Chegaram ao cliente', 'done'],
                  ].map(([label, count, hint, tone]) => (
                    <Link key={label} href="/app/pedidos" className={styles.metric} data-tone={tone}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                      <small>{hint}</small>
                    </Link>
                  ))}
                </section>
                {!configured && !branches.isPending && !branches.error && (
                  <section className={styles.setup} aria-label="Primeiros passos">
                    <div>
                      <span className={styles.eyebrow}>COMECE POR AQUI</span>
                      <h2>Sua primeira entrega em 3 passos</h2>
                      <p>Uma configuração rápida. Depois é só receber os pedidos.</p>
                    </div>
                    <ol>
                      <li data-complete={!!activeBranches.length}>
                        <span>{activeBranches.length ? '✓' : '1'}</span>
                        <Link href="/app/unidades">Confirme o endereço da loja</Link>
                      </li>
                      <li data-complete={data.availableProductCount > 0}>
                        <span>{data.availableProductCount > 0 ? '✓' : '2'}</span>
                        <Link href="/app/produtos">Cadastre seus produtos</Link>
                      </li>
                      <li>
                        <span>3</span>
                        <Link href="/app/pedidos/novo">Monte seu primeiro pedido</Link>
                      </li>
                    </ol>
                  </section>
                )}
              </>
            )
          )}
          {branches.error && <ErrorState error={branches.error} retry={() => void branches.refetch()} />}
          <div className={styles.columns}>
            <section className={styles.panel}>
              <header className={styles.sectionHead}>
                <div>
                  <h2>Últimos pedidos</h2>
                  <p>Acompanhe o que está acontecendo na sua loja.</p>
                </div>
                <Link href="/app/pedidos">Ver todos ↗</Link>
              </header>
              {recent.isPending ? (
                <LoadingState message="Carregando pedidos…" />
              ) : recent.error ? (
                <ErrorState error={recent.error} retry={() => void recent.refetch()} />
              ) : !recent.data?.items.length ? (
                <div className={styles.empty}>
                  <span aria-hidden="true">＋</span>
                  <h3>Seu próximo pedido começa aqui</h3>
                  <p>Escolha os produtos, informe o cliente e deixe a entrega com a ORBITA.</p>
                  <Link href="/app/pedidos/novo" className={styles.primary}>
                    Criar primeiro pedido
                  </Link>
                </div>
              ) : (
                <ul className={styles.orderList}>
                  {recent.data.items.map((order) => (
                    <li key={order.id}>
                      <Link href={`/app/pedidos/${order.id}`} className={styles.orderRow}>
                        <span className={styles.orderMark} aria-hidden="true">
                          {order.customerName.slice(0, 1).toUpperCase()}
                        </span>
                        <span className={styles.orderCustomer}>
                          <strong>{order.customerName}</strong>
                          <small>
                            #{order.id.slice(0, 8)} ·{' '}
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} itens
                          </small>
                        </span>
                        <span className={styles.orderState}>
                          <StatusBadge
                            status={
                              [
                                'WAITING_POOL',
                                'MATCHING',
                                'OFFERED',
                                'ASSIGNED',
                                'PICKUP_PENDING',
                              ].includes(order.delivery.status)
                                ? order.delivery.readinessStatus
                                : order.delivery.status
                            }
                          />
                          <strong>{formatCurrency(order.totalCents)}</strong>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.panelFoot}>Atualização automática a cada 30 segundos.</div>
            </section>
            <aside className={styles.side}>
              <section className={styles.catalogCard}>
                <span className={styles.eyebrow}>SEU CATÁLOGO</span>
                <h2>Produtos & lanches</h2>
                <p>Preços organizados e disponibilidade em um toque.</p>
                {data && (
                  <div className={styles.catalogCount}>
                    <strong>{data.availableProductCount}</strong>
                    <span>disponíveis de {data.productCount} cadastrados</span>
                  </div>
                )}
                <Link href="/app/produtos">
                  Gerenciar produtos <span aria-hidden="true">↗</span>
                </Link>
              </section>
              <section className={styles.panel}>
                <h2>Resumo de hoje</h2>
                {data ? (
                  <>
                    <dl className={styles.daily}>
                      <dt>Valor dos produtos em pedidos</dt>
                      <dd>{formatCurrency(data.salesTodayCents)}</dd>
                      <dt>Pedidos cancelados</dt>
                      <dd>{data.cancelledToday}</dd>
                    </dl>
                    <p className={styles.caption}>
                      Horário de Brasília. Valor dos produtos dos pedidos de hoje, sem frete. Não
                      representa pagamentos recebidos.
                    </p>
                  </>
                ) : (
                  <p className={styles.caption}>
                    Os valores aparecem quando o resumo estiver disponível.
                  </p>
                )}
                <Link href="/app/financeiro">Ver custos de entrega ↗</Link>
              </section>
            </aside>
          </div>
        </>
      )}
      <section className={styles.workflow} aria-label="Como funciona">
        <div>
          <span>01</span>
          <h3>Monte o pedido</h3>
          <p>Escolha os produtos e o destino.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Avise quando estiver pronto</h3>
          <p>Acompanhe a busca por um entregador.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Acompanhe a entrega</h3>
          <p>Da coleta até a chegada ao cliente.</p>
        </div>
      </section>
      <p className={styles.caption}>
        Já tem um pedido montado em outro sistema?{' '}
        <Link href="/app/entregas/nova">Solicite apenas a entrega.</Link>
      </p>
    </div>
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
