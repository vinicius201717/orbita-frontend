'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState, SuccessMessage } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { catalogApi } from '@/services/api/catalog.api';
import { formatCurrency } from '@/lib/format';
import { useProducts } from './queries';
import { ProductForm } from './product-form';
import type { Product } from './types';
import styles from './catalog.module.css';

type Availability = 'all' | 'available' | 'paused';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

function ProductIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 7.5 12 3l9 4.5V17l-9 4.5L3 17V7.5Z" strokeLinejoin="round" />
      <path d="m3 7.5 9 4.5 9-4.5M12 12v9.5M7.5 5.2l9 4.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CatalogPage() {
  const { user, isLoading } = useAuth();
  const products = useProducts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<Availability>('all');
  const [editor, setEditor] = useState<{ product: Product | null } | null>(null);
  const [notice, setNotice] = useState('');
  const items = products.data ?? [];
  const categories = [...new Set(items.map((item) => item.category))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const availableCount = items.filter((item) => item.available).length;
  const needle = normalize(search.trim());
  const filtered = items.filter(
    (item) =>
      (!category || item.category === category) &&
      (availability === 'all' || item.available === (availability === 'available')) &&
      (!needle || normalize(`${item.name} ${item.category} ${item.description ?? ''}`).includes(needle)),
  );

  function updateCache(product: Product) {
    queryClient.setQueryData<Product[]>(['catalog', user?.businessId], (previous) => {
      if (!previous) return [product];
      return previous.some((item) => item.id === product.id)
        ? previous.map((item) => (item.id === product.id ? product : item))
        : [...previous, product];
    });
    void queryClient.invalidateQueries({ queryKey: ['catalog', user?.businessId] });
    void queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
  }

  const toggle = useMutation({
    mutationFn: (product: Product) => catalogApi.update(product.id, { available: !product.available }),
    onSuccess: (product) => {
      updateCache(product);
      setNotice(
        `${product.name} ${product.available ? 'está disponível para novos pedidos' : 'foi pausado'}.`,
      );
    },
  });

  if (isLoading) return <LoadingState message="Abrindo seu catálogo…" />;
  if (!user?.businessId)
    return (
      <EmptyState
        title="Vamos cadastrar seu estabelecimento?"
        description="Conclua a configuração para adicionar seus produtos e começar a receber pedidos."
      >
        <Link className="button" href="/app/onboarding">
          Cadastrar estabelecimento
        </Link>
      </EmptyState>
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DO SEU BALCÃO PARA O PEDIDO</span>
          <h1>Seus produtos</h1>
          <p>Organize seu cardápio ou catálogo. Montar o próximo pedido fica muito mais fácil.</p>
        </div>
        <Button
          className={styles.primaryButton}
          onClick={() => {
            setNotice('');
            setEditor({ product: null });
          }}
        >
          <span aria-hidden="true">＋</span> Novo produto
        </Button>
      </header>

      <section className={styles.summary} aria-label="Resumo dos produtos">
        <div>
          <span>Cadastrados</span>
          <strong>{products.data ? items.length : '—'}</strong>
          <small>Seu catálogo completo</small>
        </div>
        <div>
          <span className={styles.availableDot}>Disponíveis</span>
          <strong>{products.data ? availableCount : '—'}</strong>
          <small>Prontos para entrar nos pedidos</small>
        </div>
        <div>
          <span className={styles.pausedDot}>Pausados</span>
          <strong>{products.data ? items.length - availableCount : '—'}</strong>
          <small>Ative novamente quando quiser</small>
        </div>
      </section>

      {notice ? <SuccessMessage>{notice}</SuccessMessage> : null}
      {toggle.error ? <ErrorState error={toggle.error} /> : null}
      {products.isPending ? (
        <LoadingState message="Carregando seus produtos…" />
      ) : products.error ? (
        <ErrorState error={products.error} retry={() => void products.refetch()} />
      ) : !items.length ? (
        <section className={styles.firstProduct}>
          <div className={styles.emptyIcon}>
            <ProductIcon />
          </div>
          <span className={styles.eyebrow}>COMECE PELO MAIS VENDIDO</span>
          <h2>Seu primeiro produto começa aqui.</h2>
          <p>
            Basta informar nome, preço e categoria. Você poderá editar ou pausar o produto a qualquer
            momento.
          </p>
          <Button className={styles.primaryButton} onClick={() => setEditor({ product: null })}>
            Cadastrar primeiro produto
          </Button>
        </section>
      ) : (
        <section className={styles.catalog} aria-label="Catálogo de produtos">
          <div className={styles.toolbar}>
            <div className={styles.searchField}>
              <label htmlFor="catalog-search">Buscar no catálogo</label>
              <Input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, categoria ou descrição"
              />
            </div>
            <div>
              <label htmlFor="catalog-availability">Disponibilidade</label>
              <Select
                id="catalog-availability"
                value={availability}
                onChange={(event) => setAvailability(event.target.value as Availability)}
              >
                <option value="all">Todos os produtos</option>
                <option value="available">Disponíveis</option>
                <option value="paused">Pausados</option>
              </Select>
            </div>
          </div>
          <div className={styles.categories} role="group" aria-label="Filtrar por categoria">
            <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>
              Todas as categorias
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className={styles.resultCount} role="status">
            {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
          {filtered.length ? (
            <ul className={styles.productGrid}>
              {filtered.map((product) => (
                <li key={product.id} className={styles.productCard} data-paused={!product.available}>
                  <div className={styles.productTop}>
                    <div className={styles.productIcon}>
                      <ProductIcon />
                    </div>
                    <span className={product.available ? styles.availableBadge : styles.pausedBadge}>
                      {product.available ? 'Disponível' : 'Pausado'}
                    </span>
                  </div>
                  <div className={styles.productContent}>
                    <span className={styles.productCategory}>{product.category}</span>
                    <h2>{product.name}</h2>
                    <p>{product.description || 'Sem descrição adicional.'}</p>
                  </div>
                  <strong className={styles.price}>{formatCurrency(product.priceCents)}</strong>
                  <div className={styles.productActions}>
                    <Button
                      disabled={toggle.isPending}
                      aria-label={`Editar ${product.name}`}
                      onClick={() => {
                        setNotice('');
                        setEditor({ product });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      disabled={toggle.isPending}
                      loading={toggle.isPending && toggle.variables?.id === product.id}
                      aria-label={`${product.available ? 'Pausar' : 'Ativar'} ${product.name}`}
                      onClick={() => {
                        setNotice('');
                        toggle.mutate(product);
                      }}
                    >
                      {product.available ? 'Pausar produto' : 'Ativar produto'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum produto com esses filtros"
              description="Tente outro nome ou veja todos os produtos."
            >
              <Button
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setAvailability('all');
                }}
              >
                Limpar filtros
              </Button>
            </EmptyState>
          )}
        </section>
      )}
      <aside className={styles.tip}>
        <span aria-hidden="true">↗</span>
        <p>
          <strong>Acabou algum ingrediente ou item?</strong> Pause o produto. Ele sai da lista de novos
          pedidos e continua salvo no seu catálogo.
        </p>
        <Link href="/app/pedidos/novo">Montar um pedido →</Link>
      </aside>
      {editor ? (
        <ProductForm
          product={editor.product}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={(product) => {
            updateCache(product);
            setNotice(`${product.name} ${editor.product ? 'foi atualizado' : 'foi cadastrado'}.`);
            setEditor(null);
          }}
        />
      ) : null}
    </div>
  );
}
