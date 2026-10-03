'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PageHeader, Button, Table, StatusBadge, FormField, Input, Select } from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { useBranches } from '@/features/business/queries';
import { deliveryApi } from '@/services/api/delivery.api';
import { formatCurrency, formatDate } from '@/lib/format';
import { statusLabel } from '@/constants/status';
import { deliveryStatuses, type DeliveryFilters } from './types';
import { deliveryFiltersSchema as filtersSchema } from './schemas';
const defaults = {
  status: '',
  branchId: '',
  driverId: '',
  routeId: '',
  serviceLevel: '',
  from: '',
  to: '',
} as const;
export function DeliveriesListPage() {
  const { user } = useAuth();
  const branches = useBranches();
  const [filters, setFilters] = useState<DeliveryFilters>({});
  const form = useForm<z.infer<typeof filtersSchema>>({
    resolver: zodResolver(filtersSchema),
    defaultValues: defaults,
  });
  const errors = form.formState.errors;
  const query = useInfiniteQuery({
    queryKey: ['deliveries', 'list', user?.businessId, filters],
    queryFn: ({ pageParam }) => deliveryApi.list({ ...filters, cursor: pageParam, limit: 25 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!user?.businessId,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <PageHeader
        title="Entregas"
        description="Consulte entregas e acompanhe a preparação e a distribuição."
      >
        <Link href="/app/entregas/nova">Nova entrega</Link>
      </PageHeader>
      <form
        onSubmit={form.handleSubmit((data) =>
          setFilters({
            ...data,
            from: data.from ? new Date(`${data.from}T00:00:00`).toISOString() : undefined,
            to: data.to ? new Date(`${data.to}T23:59:59.999`).toISOString() : undefined,
          }),
        )}
        noValidate
      >
        <fieldset>
          <legend>Filtros</legend>
          <FormField id="filterStatus" label="Status">
            <Select {...form.register('status')}>
              <option value="">Todos</option>
              {deliveryStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="filterBranch" label="Unidade">
            <Select {...form.register('branchId')}>
              <option value="">Todas</option>
              {branches.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="filterService" label="Modalidade">
            <Select {...form.register('serviceLevel')}>
              <option value="">Todas</option>
              <option value="ECONOMY">Econômica</option>
              <option value="SMART">Inteligente</option>
              <option value="EXPRESS">Expressa</option>
            </Select>
          </FormField>
          <FormField
            id="filterFrom"
            label="Criadas a partir de"
            error={errors.from?.message}
            hint="Datas no fuso horário do navegador."
          >
            <Input {...form.register('from')} type="date" />
          </FormField>
          <FormField id="filterTo" label="Criadas até" error={errors.to?.message}>
            <Input {...form.register('to')} type="date" />
          </FormField>
          <FormField id="filterDriver" label="ID do entregador" error={errors.driverId?.message}>
            <Input {...form.register('driverId')} />
          </FormField>
          <FormField id="filterRoute" label="ID da rota" error={errors.routeId?.message}>
            <Input {...form.register('routeId')} />
          </FormField>
          <Button type="submit">Aplicar filtros</Button>
          <Button
            onClick={() => {
              form.reset(defaults);
              setFilters({});
            }}
          >
            Limpar filtros
          </Button>
        </fieldset>
      </form>
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
          {rows.length ? (
            <Table caption="Entregas encontradas">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col">Preparação</th>
                  <th scope="col">Unidade</th>
                  <th scope="col">Modalidade</th>
                  <th scope="col">Criada em</th>
                  <th scope="col">Entregador</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((delivery) => (
                  <tr key={delivery.id}>
                    <th scope="row">{delivery.id.slice(0, 8)}</th>
                    <td>{delivery.customerName}</td>
                    <td>
                      <StatusBadge status={delivery.status} />
                    </td>
                    <td>
                      <StatusBadge status={delivery.readinessStatus} />
                    </td>
                    <td>
                      {branches.data?.find((branch) => branch.id === delivery.branchId)?.name ??
                        delivery.branchId.slice(0, 8)}
                    </td>
                    <td>
                      <StatusBadge status={delivery.serviceLevel} />
                    </td>
                    <td>{formatDate(delivery.createdAt)}</td>
                    <td>{delivery.driverId?.slice(0, 8) ?? 'Não atribuído'}</td>
                    <td>{formatCurrency(delivery.revenueCents)}</td>
                    <td>
                      <Link href={`/app/entregas/${delivery.id}`}>
                        Ver entrega {delivery.id.slice(0, 8)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhuma entrega encontrada"
              description="Confira os filtros ou registre uma nova entrega."
            />
          )}
          {query.error && <ErrorState error={query.error} retry={() => void query.fetchNextPage()} />}
          <Button onClick={() => void query.refetch()} loading={query.isRefetching}>
            Atualizar lista
          </Button>
          {query.hasNextPage && (
            <Button onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
              Carregar mais entregas
            </Button>
          )}
          <p>{rows.length} entrega(s) carregada(s). A ordenação segue o identificador da API.</p>
        </>
      )}
      {branches.error && <ErrorState error={branches.error} retry={() => void branches.refetch()} />}
    </>
  );
}
