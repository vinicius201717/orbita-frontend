'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Textarea,
} from '@/components/ui';
import { EmptyState, ErrorState, LoadingState, UnavailableFeature } from '@/components/feedback';
import { statusLabel } from '@/constants/status';
import { formatCurrency, formatDate } from '@/lib/format';
import { useNotify } from '@/providers/notification-provider';
import { adminApi } from '@/services/api/admin.api';
import { deliveryActionSchema, deliveryFilterSchema, DELIVERY_FILTER_STATUSES } from './schemas';
import { EntityLink, RecordFields } from './shared';
import type { AdminDelivery, DeliveryFilters } from './types';

type Filters = z.infer<typeof deliveryFilterSchema>;
const emptyFilters: Filters = {
  status: '',
  businessId: '',
  branchId: '',
  driverId: '',
  routeId: '',
  serviceLevel: '',
  from: '',
  to: '',
};

function queryFilters(values: Filters): DeliveryFilters {
  const filters: DeliveryFilters = { limit: 25 };
  for (const [key, value] of Object.entries(values)) {
    if (value) filters[key] = key === 'from' || key === 'to' ? new Date(value).toISOString() : value;
  }
  return filters;
}

export function AdminDeliveries({
  initialBusinessId,
  initialDriverId,
}: {
  initialBusinessId?: string;
  initialDriverId?: string;
}) {
  const initial = deliveryFilterSchema.safeParse({
    ...emptyFilters,
    businessId: initialBusinessId ?? '',
    driverId: initialDriverId ?? '',
  });
  const initialValues = initial.success ? initial.data : emptyFilters;
  const form = useForm<Filters>({
    resolver: zodResolver(deliveryFilterSchema),
    defaultValues: initialValues,
  });
  const [filters, setFilters] = useState<DeliveryFilters>(() => queryFilters(initialValues));
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const query = useQuery({
    queryKey: ['admin', 'deliveries', filters, cursor],
    queryFn: () => adminApi.deliveries({ ...filters, cursor }),
  });
  return (
    <section className="admin-deliveries">
      <PageHeader
        title="Entregas"
        description="Filtros aplicados pelo backend. Datas digitadas usam o horário local deste dispositivo."
      />
      <form
        className="form"
        onSubmit={form.handleSubmit((values) => {
          setFilters(queryFilters(values));
          setCursors([undefined]);
        })}
      >
        <fieldset>
          <legend>Filtrar entregas</legend>
          <FormField
            id="admin-delivery-status"
            label="Status"
            error={form.formState.errors.status?.message}
          >
            <Select id="admin-delivery-status" {...form.register('status')}>
              <option value="">Todos</option>
              {DELIVERY_FILTER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </FormField>
          {(
            [
              { name: 'businessId', label: 'ID da empresa' },
              { name: 'branchId', label: 'ID da unidade' },
              { name: 'driverId', label: 'ID do entregador' },
              { name: 'routeId', label: 'ID da rota' },
            ] as const
          ).map((field) => (
            <FormField
              key={field.name}
              id={`filter-${field.name}`}
              label={field.label}
              error={form.formState.errors[field.name]?.message}
            >
              <Input id={`filter-${field.name}`} {...form.register(field.name)} />
            </FormField>
          ))}
          <FormField
            id="filter-service-level"
            label="Modalidade"
            error={form.formState.errors.serviceLevel?.message}
          >
            <Select id="filter-service-level" {...form.register('serviceLevel')}>
              <option value="">Todas</option>
              {['ECONOMY', 'SMART', 'EXPRESS'].map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="filter-from"
            label="Criada a partir de"
            error={form.formState.errors.from?.message}
          >
            <Input id="filter-from" type="datetime-local" {...form.register('from')} />
          </FormField>
          <FormField id="filter-to" label="Criada até" error={form.formState.errors.to?.message}>
            <Input id="filter-to" type="datetime-local" {...form.register('to')} />
          </FormField>
          <Button type="submit" loading={query.isFetching}>
            Aplicar filtros
          </Button>{' '}
          <Button
            type="button"
            onClick={() => {
              form.reset(emptyFilters);
              setFilters(queryFilters(emptyFilters));
              setCursors([undefined]);
            }}
          >
            Limpar filtros
          </Button>
        </fieldset>
      </form>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="Nenhuma entrega encontrada" />
      ) : (
        <Table caption="Entregas administrativas">
          <thead>
            <tr>
              <th scope="col">Entrega</th>
              <th scope="col">Cliente</th>
              <th scope="col">Status</th>
              <th scope="col">Empresa</th>
              <th scope="col">Entregador</th>
              <th scope="col">Rota</th>
              <th scope="col">Criada em</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((delivery) => (
              <tr key={delivery.id}>
                <td>
                  <EntityLink kind="entregas" id={delivery.id} />
                </td>
                <td>{delivery.customerName}</td>
                <td>
                  <StatusBadge status={delivery.status} />
                </td>
                <td>
                  <EntityLink kind="empresas" id={delivery.businessId} />
                </td>
                <td>
                  <EntityLink kind="entregadores" id={delivery.driverId} />
                </td>
                <td>
                  <EntityLink kind="rotas" id={delivery.routeId} />
                </td>
                <td>{formatDate(delivery.createdAt)}</td>
                <td>{formatCurrency(delivery.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <nav aria-label="Paginação de entregas">
        <Button
          type="button"
          disabled={cursors.length === 1 || query.isFetching}
          onClick={() => setCursors((current) => current.slice(0, -1))}
        >
          Anterior
        </Button>
        <span aria-live="polite">Página {cursors.length}</span>
        <Button
          type="button"
          disabled={!query.data?.nextCursor || query.isFetching}
          onClick={() => {
            const next = query.data?.nextCursor;
            if (next) setCursors((current) => [...current, next]);
          }}
        >
          Próxima
        </Button>
      </nav>
    </section>
  );
}

function DeliveryAdminActions({ delivery }: { delivery: AdminDelivery }) {
  const queryClient = useQueryClient();
  const { notify } = useNotify();
  const [pending, setPending] = useState<z.infer<typeof deliveryActionSchema> | 'return' | null>(null);
  const form = useForm<z.infer<typeof deliveryActionSchema>>({
    resolver: zodResolver(deliveryActionSchema),
    defaultValues: { action: 'reassign', reason: '' },
  });
  const mutation = useMutation({
    mutationFn: (action: Exclude<typeof pending, null>) =>
      action === 'return'
        ? adminApi.completeReturn(delivery.id)
        : adminApi.deliveryAction(delivery.id, action.action, action.reason),
    onError: () => setPending(null),
    onSuccess: async () => {
      setPending(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      notify('Ação administrativa registrada.', 'success');
    },
  });
  const isFinal = ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(delivery.status);
  const description =
    pending === 'return'
      ? 'Confirme somente após verificar que a carga foi devolvida à empresa. O backend encerrará a custódia e registrará a ação.'
      : pending?.action === 'confirm'
        ? 'Confirmar o recebimento como administrador registra a comprovação e os lançamentos financeiros. Use somente após verificar a entrega.'
        : delivery.pickedUpAt
          ? 'A carga já foi coletada. O backend exigirá devolução e manterá a custódia com o entregador atual.'
          : 'A entrega será devolvida à fila de oportunidades, com cancelamento das ofertas afetadas. O backend reavaliará as condições atuais.';
  return (
    <Card title="Ações administrativas">
      {isFinal ? (
        <p>Esta entrega está encerrada. Novas ações operacionais não estão disponíveis.</p>
      ) : (
        <form className="form" onSubmit={form.handleSubmit(setPending)}>
          <FormField
            id="admin-delivery-action"
            label="Ação"
            error={form.formState.errors.action?.message}
          >
            <Select id="admin-delivery-action" {...form.register('action')}>
              <option value="reassign">Reatribuir / solicitar devolução</option>
              <option value="confirm">Confirmar entrega administrativamente</option>
            </Select>
          </FormField>
          <FormField
            id="admin-delivery-reason"
            label="Motivo e evidência"
            error={form.formState.errors.reason?.message}
          >
            <Textarea id="admin-delivery-reason" maxLength={500} {...form.register('reason')} />
          </FormField>
          <Button type="submit" loading={mutation.isPending}>
            Revisar ação
          </Button>
        </form>
      )}
      {['RETURN_REQUIRED', 'RETURNING'].includes(delivery.status) && (
        <Button type="button" loading={mutation.isPending} onClick={() => setPending('return')}>
          Confirmar carga devolvida
        </Button>
      )}
      {mutation.isError && <ErrorState error={mutation.error} />}
      <ConfirmDialog
        open={pending !== null}
        title="Confirmar ação administrativa"
        description={description}
        loading={mutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) mutation.mutate(pending);
        }}
      />
    </Card>
  );
}

export function AdminDeliveryDetail({ id }: { id: string }) {
  const delivery = useQuery({
    queryKey: ['admin', 'delivery', id],
    queryFn: () => adminApi.delivery(id),
  });
  const incidents = useQuery({
    queryKey: ['admin', 'delivery', id, 'incidents'],
    queryFn: () => adminApi.incidents(id),
  });
  return (
    <section className="admin-delivery-detail">
      <PageHeader title="Detalhes da entrega">
        <Link href="/admin/entregas">Voltar para entregas</Link>
      </PageHeader>
      {delivery.isPending ? (
        <LoadingState />
      ) : delivery.isError ? (
        <ErrorState error={delivery.error} retry={() => void delivery.refetch()} />
      ) : (
        <>
          <Card title={`Entrega ${delivery.data.id.slice(0, 8)}`}>
            <RecordFields
              items={[
                { label: 'ID', value: delivery.data.id },
                { label: 'Status', value: <StatusBadge status={delivery.data.status} /> },
                { label: 'Preparação', value: <StatusBadge status={delivery.data.readinessStatus} /> },
                { label: 'Modalidade', value: statusLabel(delivery.data.serviceLevel) },
                {
                  label: 'Empresa',
                  value: <EntityLink kind="empresas" id={delivery.data.businessId} />,
                },
                { label: 'Unidade', value: delivery.data.branchId },
                {
                  label: 'Entregador',
                  value: <EntityLink kind="entregadores" id={delivery.data.driverId} />,
                },
                { label: 'Rota', value: <EntityLink kind="rotas" id={delivery.data.routeId} /> },
                { label: 'Cliente', value: delivery.data.customerName },
                { label: 'Telefone', value: delivery.data.customerPhone },
                {
                  label: 'Coleta (latitude, longitude)',
                  value: `${delivery.data.pickupLatitude}, ${delivery.data.pickupLongitude}`,
                },
                {
                  label: 'Entrega (latitude, longitude)',
                  value: `${delivery.data.dropoffLatitude}, ${delivery.data.dropoffLongitude}`,
                },
                { label: 'Complemento', value: delivery.data.complement },
                { label: 'Valor', value: formatCurrency(delivery.data.revenueCents) },
                { label: 'Repasse', value: formatCurrency(delivery.data.driverPayoutCents) },
                { label: 'Gorjeta', value: formatCurrency(delivery.data.tipCents) },
                { label: 'Criada em', value: formatDate(delivery.data.createdAt) },
                { label: 'Pronta em', value: formatDate(delivery.data.readyAt) },
                { label: 'Coletada em', value: formatDate(delivery.data.pickedUpAt) },
                { label: 'Entregue em', value: formatDate(delivery.data.deliveredAt) },
                { label: 'Prazo de entrega', value: formatDate(delivery.data.deliveryDeadline) },
                {
                  label: 'Motivo de cancelamento / reatribuição',
                  value: delivery.data.cancellationReason,
                },
              ]}
            />
          </Card>
          <Table caption="Itens do pedido">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {delivery.data.items.map((item, index) => (
                <tr key={`${index}-${item.name}`}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <UnavailableFeature
            title="Comprovante detalhado"
            description="A API de consulta da entrega não retorna o registro detalhado de comprovação. O PIN do cliente não é exibido nesta tela."
          />
          <DeliveryAdminActions delivery={delivery.data} />
        </>
      )}
      <section aria-labelledby="admin-delivery-incidents">
        <h2 id="admin-delivery-incidents">Incidentes</h2>
        {incidents.isPending ? (
          <LoadingState />
        ) : incidents.isError ? (
          <ErrorState error={incidents.error} retry={() => void incidents.refetch()} />
        ) : incidents.data.length === 0 ? (
          <EmptyState title="Nenhum incidente registrado" />
        ) : (
          <Table caption="Incidentes desta entrega">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Data</th>
                <th scope="col">Notas</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data.map((incident) => (
                <tr key={incident.id}>
                  <td>{statusLabel(incident.type)}</td>
                  <td>{formatDate(incident.createdAt)}</td>
                  <td>{incident.notes ?? 'Sem notas'}</td>
                  <td>
                    {incident.resolvedAt
                      ? `Resolvido em ${formatDate(incident.resolvedAt)}`
                      : 'Em aberto'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </section>
  );
}
