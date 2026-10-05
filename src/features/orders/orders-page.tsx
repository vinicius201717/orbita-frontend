'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { formatCurrency, formatDate } from '@/lib/format';
import { useOrders } from './queries';
import { orderStage, orderStageLabel, orderStages } from './order-state';
import { OrderActions } from './order-actions';
import styles from './orders.module.css';

export function OrdersPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const orders = useOrders({ stage: stage || undefined, search: query || undefined });
  const items = orders.data?.pages.flatMap((page) => page.items) ?? [];
  if (!user?.businessId)
    return (
      <EmptyState title="Configure seu estabelecimento para começar">
        <Link href="/app/onboarding">Configurar loja</Link>
      </EmptyState>
    );
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DO PREPARO ATÉ A PORTA DO CLIENTE</span>
          <h1>Pedidos da loja</h1>
          <p>Organize a saída dos pedidos e acompanhe cada etapa.</p>
        </div>
        <Link href="/app/pedidos/novo" className={styles.primaryLink}>
          + Novo pedido
        </Link>
      </header>
      <section className={styles.panel} aria-label="Filtrar pedidos">
        <div className={styles.filters} role="group" aria-label="Etapa do pedido">
          <Button aria-pressed={!stage} onClick={() => setStage('')}>
            Todos
          </Button>
          {orderStages.map((item) => (
            <Button
              key={item.value}
              aria-pressed={stage === item.value}
              onClick={() => setStage(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
        >
          <label htmlFor="order-list-search" className={styles.searchLabel}>
            Buscar por cliente ou telefone
          </label>
          <Input
            id="order-list-search"
            type="search"
            value={search}
            maxLength={120}
            placeholder="Nome do cliente ou telefone"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit">Buscar</Button>
          {query && (
            <Button
              onClick={() => {
                setSearch('');
                setQuery('');
              }}
            >
              Limpar
            </Button>
          )}
        </form>
      </section>
      {orders.isPending ? (
        <LoadingState message="Carregando pedidos…" />
      ) : orders.error && !items.length ? (
        <ErrorState error={orders.error} retry={() => void orders.refetch()} />
      ) : !items.length ? (
        <EmptyState
          title={
            stage || query ? 'Nenhum pedido com esse filtro' : 'Tudo pronto para seu primeiro pedido'
          }
          description={
            stage || query
              ? 'Escolha outra etapa ou procure por outro cliente.'
              : 'Adicione produtos do seu catálogo e informe o destino. A entrega será criada junto com o pedido.'
          }
        >
          <Link className={styles.primaryLink} href="/app/pedidos/novo">
            Criar pedido
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className={styles.ordersGrid}>
            {items.map((order) => (
              <article className={styles.orderCard} key={order.id}>
                <header>
                  <span className={styles.badge} data-stage={orderStage(order.delivery)}>
                    {orderStageLabel(order.delivery)}
                  </span>
                  <small>#{order.id.slice(0, 8)}</small>
                </header>
                <Link href={`/app/pedidos/${order.id}`} className={styles.customerLink}>
                  <h2>{order.customerName}</h2>
                </Link>
                <p className={styles.orderTime}>{formatDate(order.createdAt)}</p>
                <ul className={styles.cardItems}>
                  {order.items.slice(0, 3).map((item) => (
                    <li key={item.productId}>
                      <span>{item.quantity} ×</span> {item.name}
                    </li>
                  ))}
                </ul>
                {order.items.length > 3 && (
                  <p className={styles.note}>+ {order.items.length - 3} outros produtos</p>
                )}
                <p className={styles.orderAddress}>{order.address}</p>
                <div className={styles.cardTotal}>
                  <span>Produtos</span>
                  <strong>{formatCurrency(order.totalCents)}</strong>
                </div>
                <OrderActions delivery={order.delivery} compact />
                <Link className={styles.detailLink} href={`/app/pedidos/${order.id}`}>
                  Abrir pedido e entrega ↗
                </Link>
              </article>
            ))}
          </div>
          {orders.error && <ErrorState error={orders.error} retry={() => void orders.refetch()} />}
          {orders.hasNextPage && (
            <Button loading={orders.isFetchingNextPage} onClick={() => void orders.fetchNextPage()}>
              Carregar mais pedidos
            </Button>
          )}
        </>
      )}
      <p className={styles.note}>
        Os pedidos são exibidos do mais recente para o mais antigo. Atualização automática a cada 30
        segundos.
      </p>
    </div>
  );
}
