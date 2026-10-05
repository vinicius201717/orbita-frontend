'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, FormField, Input, Select, Textarea } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { useBranches } from '@/features/business/queries';
import { useProducts } from '@/features/catalog/queries';
import { DeliveryAddressField } from '@/features/orders-address/address-field';
import { ordersApi } from '@/services/api/orders.api';
import { formatCurrency } from '@/lib/format';
import { orderFormSchema, type OrderFormInput } from './schemas';
import { buildOrderDraft, type OrderDraft } from './draft';
import { serviceOptions } from './order-state';
import styles from './orders.module.css';

const categoryOptions = [
  ['AMBIENT', 'Sem cuidado especial'],
  ['HOT', 'Manter quente'],
  ['COLD', 'Manter refrigerado'],
  ['FROZEN', 'Manter congelado'],
  ['FRAGILE', 'Frágil'],
  ['BEVERAGE', 'Bebidas'],
  ['MEDICINE', 'Medicamentos'],
  ['OTHER', 'Outro'],
];

export function NewOrderPage() {
  const { user } = useAuth();
  const branches = useBranches();
  const products = useProducts();
  const client = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [address, setAddress] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const submission = useRef<{ signature: string; key: string } | null>(null);
  const busy = useRef(false);
  const form = useForm<OrderFormInput>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      branchId: '',
      customerName: '',
      customerPhone: '',
      customerOptIn: false,
      complement: '',
      notes: '',
      serviceLevel: 'SMART',
      category: 'AMBIENT',
      preparationMinutes: 15,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  function changeQuantity(id: string, quantity: number) {
    setQuantities((previous) => ({ ...previous, [id]: Math.max(0, Math.min(100, quantity)) }));
  }

  function review(fields: OrderFormInput) {
    setError(null);
    try {
      setDraft(buildOrderDraft(fields, quantities, products.data ?? [], branches.data ?? [], address));
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (cause) {
      setError(cause);
    }
  }

  async function create() {
    if (!draft || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const signature = JSON.stringify(draft.input);
    if (submission.current?.signature !== signature)
      submission.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await ordersApi.create(draft.input, submission.current.key);
      client.setQueryData(['merchant-orders', 'detail', user?.businessId, result.id], result);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['merchant-orders'] }),
        client.invalidateQueries({ queryKey: ['deliveries'] }),
        client.invalidateQueries({ queryKey: ['business'] }),
      ]);
      router.push(`/app/pedidos/${result.id}`);
    } catch (cause) {
      setError(cause);
      busy.current = false;
      setPending(false);
    }
  }

  if (!user?.businessId)
    return (
      <EmptyState
        title="Vamos configurar sua loja primeiro"
        description="Cadastre a empresa e uma unidade para começar a receber pedidos."
      >
        <Link className="button" href="/app/onboarding">
          Configurar loja
        </Link>
      </EmptyState>
    );
  if (branches.isPending || products.isPending) return <LoadingState message="Preparando sua loja…" />;
  if (branches.error || products.error)
    return (
      <ErrorState
        error={branches.error || products.error}
        retry={() => {
          void branches.refetch();
          void products.refetch();
        }}
      />
    );
  const activeBranches = branches.data?.filter((branch) => branch.active) ?? [];
  if (!activeBranches.length)
    return (
      <EmptyState
        title="De onde o pedido vai sair?"
        description="Cadastre uma unidade ativa com o endereço de coleta."
      >
        <Link className="button" href="/app/unidades/nova">
          Cadastrar unidade
        </Link>
      </EmptyState>
    );
  const catalog = products.data ?? [];
  const availableProducts = catalog.filter((product) => product.available);
  if (!availableProducts.length)
    return (
      <EmptyState
        title="Seu primeiro pedido começa pelos produtos"
        description="Cadastre os produtos e deixe pelo menos um disponível para venda."
      >
        <Link className="button" href="/app/produtos">
          Ir para produtos
        </Link>
      </EmptyState>
    );
  const selected = catalog.filter((product) => (quantities[product.id] ?? 0) > 0);
  const subtotal = selected.reduce(
    (total, product) => total + product.priceCents * quantities[product.id],
    0,
  );
  const itemCount = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const shownProducts = availableProducts.filter((product) =>
    `${product.name} ${product.category}`
      .toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR')),
  );

  if (draft)
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>QUASE PRONTO</span>
            <h1>Confira o pedido</h1>
            <p>Revise os itens e o destino antes de confirmar.</p>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
          >
            Voltar e editar
          </Button>
        </header>
        <div className={styles.composer}>
          <div className={styles.sections}>
            <section className={styles.panel}>
              <h2>Cliente e entrega</h2>
              <dl className={styles.details}>
                <dt>Cliente</dt>
                <dd>{draft.input.customer.name}</dd>
                <dt>Telefone</dt>
                <dd>{draft.input.customer.phone || 'Não informado'}</dd>
                <dt>Endereço</dt>
                <dd>{draft.input.address}</dd>
                {draft.input.dropoff.complement && (
                  <>
                    <dt>Complemento</dt>
                    <dd>{draft.input.dropoff.complement}</dd>
                  </>
                )}
                <dt>Unidade de coleta</dt>
                <dd>{draft.branchName}</dd>
                <dt>Entrega</dt>
                <dd>
                  {serviceOptions.find((service) => service.value === draft.input.serviceLevel)?.name}
                </dd>
                <dt>Preparo</dt>
                <dd>
                  {draft.input.preparationMinutes === 0
                    ? 'Já está pronto para coleta'
                    : `${draft.input.preparationMinutes} minutos`}
                </dd>
                {draft.input.notes && (
                  <>
                    <dt>Observações</dt>
                    <dd>{draft.input.notes}</dd>
                  </>
                )}
              </dl>
            </section>
            <section className={styles.panel}>
              <h2>Produtos do pedido</h2>
              <ul className={styles.reviewItems}>
                {draft.items.map((item) => (
                  <li key={item.productId}>
                    <div>
                      <strong>
                        {item.quantity} × {item.name}
                      </strong>
                      <span>{formatCurrency(item.unitPriceCents)} por unidade</span>
                    </div>
                    <strong>{formatCurrency(item.totalCents)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className={styles.summary}>
            <span className={styles.eyebrow}>RESUMO DO PEDIDO</span>
            <div className={styles.total}>
              <span>Produtos</span>
              <strong>{formatCurrency(draft.subtotalCents)}</strong>
            </div>
            <p className={styles.note}>
              O valor dos produtos será confirmado com os preços atuais da loja. O custo de entrega é
              calculado separadamente.
            </p>
            {draft.input.preparationMinutes === 0 && (
              <p className={styles.notice}>Ao confirmar, o pedido já ficará pronto para coleta.</p>
            )}
            {error != null && <ErrorState error={error} />}
            <Button className={styles.primary} onClick={() => void create()} loading={pending}>
              Confirmar pedido
            </Button>
            <p className={styles.note}>Você pode acompanhar a entrega assim que o pedido for criado.</p>
          </aside>
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>SUA LOJA EM MOVIMENTO</span>
          <h1>Novo pedido</h1>
          <p>Escolha os produtos. A ORBITA cuida do caminho.</p>
        </div>
        <Link className={styles.quietLink} href="/app/pedidos">
          Voltar aos pedidos
        </Link>
      </header>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(review)(event)}
        className={styles.composer}
      >
        <div className={styles.sections}>
          <section className={styles.panel} aria-labelledby="order-products">
            <div className={styles.sectionHeading}>
              <span className={styles.step}>1</span>
              <div>
                <h2 id="order-products">O que vai no pedido?</h2>
                <p>Adicione os produtos e ajuste as quantidades.</p>
              </div>
            </div>
            <FormField id="order-search" label="Buscar produto">
              <Input
                type="search"
                placeholder="Nome ou categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <div className={styles.productGrid}>
              {shownProducts.map((product) => {
                const quantity = quantities[product.id] ?? 0;
                return (
                  <article key={product.id} className={styles.product} data-selected={quantity > 0}>
                    <span className={styles.productCategory}>{product.category}</span>
                    <h3>{product.name}</h3>
                    {product.description && <p>{product.description}</p>}
                    <div className={styles.productBottom}>
                      <strong>{formatCurrency(product.priceCents)}</strong>
                      {quantity ? (
                        <div className={styles.quantity}>
                          <Button
                            aria-label={`Remover uma unidade de ${product.name}`}
                            onClick={() => changeQuantity(product.id, quantity - 1)}
                          >
                            −
                          </Button>
                          <output aria-label={`Quantidade de ${product.name}`}>{quantity}</output>
                          <Button
                            aria-label={`Adicionar uma unidade de ${product.name}`}
                            disabled={quantity >= 100}
                            onClick={() => changeQuantity(product.id, quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      ) : (
                        <Button
                          aria-label={`Adicionar ${product.name}`}
                          onClick={() => changeQuantity(product.id, 1)}
                        >
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {!shownProducts.length && (
              <p className={styles.note}>Nenhum produto encontrado. Tente outro nome.</p>
            )}
          </section>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>2</span>
              <div>
                <h2>Para quem vamos entregar?</h2>
                <p>Preencha os dados do cliente e confirme o destino.</p>
              </div>
            </div>
            <div className={styles.twoColumns}>
              <FormField
                id="order-customer"
                label="Nome do cliente"
                error={errors.customerName?.message}
              >
                <Input {...register('customerName')} autoComplete="name" maxLength={120} />
              </FormField>
              <FormField
                id="order-phone"
                label="Telefone com DDD (opcional)"
                error={errors.customerPhone?.message}
              >
                <Input
                  {...register('customerPhone')}
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                />
              </FormField>
            </div>
            <label className={styles.checkbox}>
              <Checkbox {...register('customerOptIn')} />
              <span>O cliente autorizou receber mensagens sobre esta entrega.</span>
            </label>
            <DeliveryAddressField value={address} onChange={setAddress} />
            <FormField id="order-complement" label="Complemento ou referência (opcional)">
              <Input
                {...register('complement')}
                placeholder="Apartamento, bloco, ponto de referência"
                maxLength={500}
              />
            </FormField>
          </section>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>3</span>
              <div>
                <h2>Vamos organizar a saída</h2>
                <p>Defina a coleta e o tempo de preparo.</p>
              </div>
            </div>
            {activeBranches.length > 1 ? (
              <FormField id="order-branch" label="Unidade que vai preparar">
                <Select {...register('branchId')}>
                  <option value="">Escolha a unidade</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <p className={styles.branchNote}>
                Coleta em <strong>{activeBranches[0].name}</strong>
                <span>{activeBranches[0].address}</span>
              </p>
            )}
            <fieldset className={styles.services}>
              <legend>Como quer enviar?</legend>
              {serviceOptions.map((service) => (
                <label key={service.value} className={styles.service}>
                  <input {...register('serviceLevel')} type="radio" value={service.value} />
                  <span>
                    <strong>{service.name}</strong>
                    <small>{service.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className={styles.twoColumns}>
              <FormField
                id="order-preparation"
                label="Tempo de preparo (minutos)"
                hint="Use 0 se já estiver pronto para coleta."
                error={errors.preparationMinutes?.message}
              >
                <Input
                  {...register('preparationMinutes', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  step={1}
                />
              </FormField>
              <FormField id="order-care" label="Cuidados com os produtos">
                <Select {...register('category')}>
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField
              id="order-notes"
              label="Observações para o preparo (opcional)"
              error={errors.notes?.message}
            >
              <Textarea
                {...register('notes')}
                placeholder="Ex.: sem cebola, molho separado"
                maxLength={500}
              />
            </FormField>
          </section>
        </div>
        <aside className={styles.summary}>
          <span className={styles.eyebrow}>SEU PEDIDO</span>
          <h2>
            {itemCount
              ? `${itemCount} ${itemCount === 1 ? 'item escolhido' : 'itens escolhidos'}`
              : 'Vamos montar?'}
          </h2>
          {selected.length ? (
            <ul className={styles.cart}>
              {selected.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>
                      {quantities[product.id]} × {product.name}
                    </strong>
                    {!product.available && <small>Indisponível — remova este produto.</small>}
                    <Button
                      className={styles.remove}
                      aria-label={`Remover ${product.name} do pedido`}
                      onClick={() => changeQuantity(product.id, 0)}
                    >
                      Remover
                    </Button>
                  </div>
                  <span>{formatCurrency(product.priceCents * quantities[product.id])}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>Seus produtos aparecem aqui conforme você adiciona.</p>
          )}
          <div className={styles.total}>
            <span>Subtotal dos produtos</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <p className={styles.note}>A entrega é calculada separadamente ao confirmar o pedido.</p>
          {error != null && <ErrorState error={error} />}
          <Button className={styles.primary} type="submit">
            Revisar pedido
          </Button>
          <Link className={styles.quietLink} href="/app/produtos">
            Gerenciar meus produtos
          </Link>
        </aside>
      </form>
    </div>
  );
}
