'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Textarea,
} from '@/components/ui';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessMessage,
  UnavailableFeature,
} from '@/components/feedback';
import { ExternalNavigationLinks } from '@/components/external-navigation-links';
import { useAuth } from '@/providers/auth-provider';
import { useNotify } from '@/providers/notification-provider';
import { useBranches } from '@/features/business/queries';
import { deliveryApi } from '@/services/api/delivery.api';
import { formatCurrency, formatDate, formatDuration } from '@/lib/format';
import { cancelSchema, incidentSchema, type IncidentInput } from './schemas';
import { incidentLabels, incidentTypes, type Delivery } from './types';

export function DeliveryDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  const enabled = !!user?.businessId && z.uuid().safeParse(id).success;
  const query = useQuery({
    queryKey: ['deliveries', 'detail', id],
    queryFn: () => deliveryApi.get(id),
    enabled,
  });
  const branches = useBranches();
  if (!user?.businessId)
    return (
      <EmptyState title="Cadastre sua empresa">
        <Link href="/app/onboarding">Configuração inicial</Link>
      </EmptyState>
    );
  if (!enabled) return <ErrorState error={new Error('Identificador de entrega inválido.')} />;
  if (query.isPending) return <LoadingState message="Carregando entrega…" />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return null;
  const delivery = query.data;
  // API ownership is authoritative; avoid rendering even a malformed cross-tenant response.
  if (delivery.businessId !== user.businessId)
    return <ErrorState error={new Error('Esta entrega não pertence à sua empresa.')} />;
  const branch = branches.data?.find((item) => item.id === delivery.branchId);
  const timezone = branch?.timezone ?? 'America/Sao_Paulo';
  const timeline = [
    ['Registrada', delivery.createdAt],
    ['Pronta para coleta', delivery.readyAt],
    ['Coletada', delivery.pickedUpAt],
    ['Entregue', delivery.deliveredAt],
    ['Confirmada', delivery.verifiedAt],
  ]
    .filter((entry): entry is [string, string] => !!entry[1])
    .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime());
  return (
    <>
      <PageHeader
        title={`Entrega ${delivery.id.slice(0, 8)}`}
        description={`Código completo: ${delivery.id}`}
      >
        <Link href="/app/entregas">Voltar às entregas</Link>
        <Button loading={query.isRefetching} onClick={() => void query.refetch()}>
          Atualizar entrega
        </Button>
      </PageHeader>
      <Card title="Status">
        <dl>
          <dt>Distribuição</dt>
          <dd>
            <StatusBadge status={delivery.status} />
          </dd>
          <dt>Preparação</dt>
          <dd>
            <StatusBadge status={delivery.readinessStatus} />
          </dd>
          <dt>Última atualização</dt>
          <dd>{formatDate(delivery.updatedAt, timezone)}</dd>
        </dl>
        <ReadyAction delivery={delivery} />
      </Card>
      <Card title="Pedido">
        <dl>
          <dt>Referência externa</dt>
          <dd>{delivery.externalReference || 'Não informada'}</dd>
          <dt>Modalidade</dt>
          <dd>
            <StatusBadge status={delivery.serviceLevel} />
          </dd>
          <dt>Categoria</dt>
          <dd>
            <StatusBadge status={delivery.category} />
          </dd>
          <dt>Unidades de capacidade</dt>
          <dd>{delivery.capacityUnits}</dd>
          <dt>Peso</dt>
          <dd>{delivery.weightGrams == null ? 'Não informado' : `${delivery.weightGrams} g`}</dd>
          <dt>Volume</dt>
          <dd>{delivery.volumeCm3 == null ? 'Não informado' : `${delivery.volumeCm3} cm³`}</dd>
          <dt>Temperatura</dt>
          <dd>{delivery.temperatureRequirement || 'Não informada'}</dd>
          <dt>Embalagem</dt>
          <dd>{delivery.packageType || 'Não informada'}</dd>
        </dl>
        <ul>
          {delivery.items.map((item, index) => (
            <li key={index}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Cliente">
        <dl>
          <dt>Nome</dt>
          <dd>{delivery.customerName}</dd>
          <dt>Telefone</dt>
          <dd>{delivery.customerPhone || 'Não informado'}</dd>
        </dl>
      </Card>
      <Card title="Local da entrega">
        <p>
          {delivery.dropoffLatitude}, {delivery.dropoffLongitude}
        </p>
        <p>{delivery.complement || 'Sem complemento informado.'}</p>
        <ExternalNavigationLinks
          latitude={delivery.dropoffLatitude}
          longitude={delivery.dropoffLongitude}
        />
      </Card>
      <Card title="Coleta e prazos">
        <dl>
          <dt>Unidade</dt>
          <dd>{branch?.name ?? delivery.branchId}</dd>
          {branch && (
            <>
              <dt>Endereço de coleta</dt>
              <dd>{branch.address}</dd>
            </>
          )}
          <dt>Previsão de preparo</dt>
          <dd>{formatDate(delivery.estimatedReadyAt, timezone)}</dd>
          <dt>Limite para coleta</dt>
          <dd>{formatDate(delivery.pickupDeadline, timezone)}</dd>
          <dt>Limite para entrega</dt>
          <dd>{formatDate(delivery.deliveryDeadline, timezone)}</dd>
          <dt>Duração máxima</dt>
          <dd>{formatDuration(delivery.maxDeliveryDurationSeconds)}</dd>
        </dl>
        <ExternalNavigationLinks
          latitude={delivery.pickupLatitude}
          longitude={delivery.pickupLongitude}
        />
      </Card>
      <Card title="Linha do tempo">
        <p>Horários em {timezone}. São exibidos os marcos retornados pela API.</p>
        <ol>
          {timeline.map(([label, date]) => (
            <li key={label}>
              {label}: <time dateTime={date}>{formatDate(date, timezone)}</time>
            </li>
          ))}
        </ol>
      </Card>
      <Card title="Entregador">
        <p>
          {delivery.driverId
            ? `Identificador do entregador: ${delivery.driverId}`
            : 'Entregador ainda não atribuído.'}
        </p>
        {delivery.driverId && <p>Nome e contato do entregador não são fornecidos neste contrato.</p>}
      </Card>
      {delivery.routeId ? (
        <BusinessRouteSection id={delivery.routeId} deliveryId={delivery.id} timezone={timezone} />
      ) : (
        <Card title="Rota">
          <p>A entrega ainda não está vinculada a uma rota.</p>
        </Card>
      )}
      <Card title="Custo">
        <dl>
          <dt>Valor logístico informado pela API</dt>
          <dd>{formatCurrency(delivery.revenueCents)}</dd>
          <dt>Gorjeta</dt>
          <dd>{formatCurrency(delivery.tipCents)}</dd>
        </dl>
        <Link href="/app/financeiro">Consultar lançamentos financeiros</Link>
      </Card>
      <Card title="Comprovante">
        <p>
          {delivery.verifiedAt
            ? `Recebimento confirmado em ${formatDate(delivery.verifiedAt, timezone)}.`
            : 'Recebimento ainda não confirmado.'}
        </p>
        <UnavailableFeature
          title="Documento do comprovante"
          description="A API não oferece consulta ou download de comprovante detalhado. O código privado do cliente não é exibido nesta interface."
        />
      </Card>
      <DeliveryIncidents id={delivery.id} timezone={timezone} />
      <CancelDelivery delivery={delivery} />
    </>
  );
}

function useRefreshDelivery(id: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['deliveries'] }),
      client.invalidateQueries({ queryKey: ['business'] }),
      client.invalidateQueries({ queryKey: ['routes'] }),
      client.invalidateQueries({ queryKey: ['incidents', id] }),
    ]);
}

export function ReadyAction({ delivery }: { delivery: Delivery }) {
  const refresh = useRefreshDelivery(delivery.id);
  const { notify } = useNotify();
  const mutation = useMutation({
    mutationFn: () => deliveryApi.ready(delivery.id),
    onSuccess: async () => {
      await refresh();
      notify('Pedido marcado como pronto para coleta.');
    },
  });
  const show =
    delivery.readinessStatus === 'PREPARING' &&
    ['WAITING_POOL', 'MATCHING', 'OFFERED', 'ASSIGNED', 'PICKUP_PENDING'].includes(delivery.status);
  if (!show) return null;
  return (
    <div className="delivery-ready">
      <p>Pedido ainda em preparação.</p>
      <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
        Marcar como pronto para coleta
      </Button>
      {mutation.error && <ErrorState error={mutation.error} />}
    </div>
  );
}

export function BusinessRouteSection({
  id,
  deliveryId,
  timezone,
}: {
  id: string;
  deliveryId: string;
  timezone: string;
}) {
  const query = useQuery({ queryKey: ['routes', 'business', id], queryFn: () => deliveryApi.route(id) });
  return (
    <Card title="Rota">
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <dl>
              <dt>Código da rota</dt>
              <dd>{query.data.id}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={query.data.status} />
              </dd>
              <dt>Iniciada em</dt>
              <dd>{formatDate(query.data.startedAt, timezone)}</dd>
              <dt>Concluída em</dt>
              <dd>{formatDate(query.data.completedAt, timezone)}</dd>
            </dl>
            <Table caption="Paradas desta entrega">
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col">Status</th>
                  <th scope="col">Previsão</th>
                  <th scope="col">Chegada</th>
                  <th scope="col">Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {query.data.stops
                  .filter((stop) => stop.deliveryId === deliveryId)
                  .map((stop) => (
                    <tr key={stop.id}>
                      <th scope="row">{stop.type === 'PICKUP' ? 'Coleta' : 'Entrega'}</th>
                      <td>
                        <StatusBadge status={stop.status} />
                      </td>
                      <td>{formatDate(stop.estimatedArrivalAt, timezone)}</td>
                      <td>{formatDate(stop.arrivedAt, timezone)}</td>
                      <td>{formatDate(stop.completedAt, timezone)}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </>
        )
      )}
    </Card>
  );
}

export function DeliveryIncidents({ id, timezone }: { id: string; timezone: string }) {
  const query = useQuery({ queryKey: ['incidents', id], queryFn: () => deliveryApi.incidents(id) });
  const refresh = useRefreshDelivery(id);
  const form = useForm<IncidentInput>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: 'OTHER', notes: '' },
  });
  const mutation = useMutation({
    mutationFn: (data: IncidentInput) => deliveryApi.incident(id, data),
    onSuccess: async () => {
      form.reset();
      await refresh();
    },
  });
  return (
    <Card title="Incidentes">
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <ul>
          {query.data.map((incident) => (
            <li key={incident.id}>
              <strong>{incidentLabels[incident.type]}</strong> —{' '}
              {formatDate(incident.createdAt, timezone)}
              <p>{incident.notes || 'Sem observação.'}</p>
              <p>
                {incident.resolvedAt
                  ? `Resolvido em ${formatDate(incident.resolvedAt, timezone)}`
                  : 'Pendente de resolução.'}
                {incident.resolution ? ` ${incident.resolution}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum incidente registrado.</p>
      )}
      <p>
        A consulta retorna até 50 incidentes mais recentes. Anexos e resolução não estão disponíveis
        nesta interface.
      </p>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} noValidate>
        <fieldset disabled={mutation.isPending}>
          <legend>Registrar incidente</legend>
          <FormField
            id="incident-type"
            label="Tipo do incidente"
            error={form.formState.errors.type?.message}
          >
            <Select {...form.register('type')}>
              {incidentTypes.map((type) => (
                <option key={type} value={type}>
                  {incidentLabels[type]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="incident-notes"
            label="Observações (opcional)"
            error={form.formState.errors.notes?.message}
          >
            <Textarea {...form.register('notes')} maxLength={2000} />
          </FormField>
          <Button type="submit" loading={mutation.isPending}>
            Registrar incidente
          </Button>
        </fieldset>
        {mutation.error && <ErrorState error={mutation.error} />}
        {mutation.isSuccess && <SuccessMessage>Incidente registrado.</SuccessMessage>}
      </form>
    </Card>
  );
}

export function CancelDelivery({ delivery }: { delivery: Delivery }) {
  const [reason, setReason] = useState<string | null>(null);
  const refresh = useRefreshDelivery(delivery.id);
  const form = useForm<z.infer<typeof cancelSchema>>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: '' },
  });
  const mutation = useMutation({
    mutationFn: (value: string) => deliveryApi.cancel(delivery.id, value),
    onError: () => setReason(null),
    onSuccess: async () => {
      setReason(null);
      form.reset();
      await refresh();
    },
  });
  const unavailable = ['DELIVERED', 'RETURNED', 'CANCELLED', 'RETURN_REQUIRED', 'RETURNING'].includes(
    delivery.status,
  );
  return (
    <Card title="Cancelamento">
      {delivery.cancellationReason && <p>Motivo registrado: {delivery.cancellationReason}</p>}
      {unavailable ? (
        <p>
          Cancelamento indisponível no estado atual.{' '}
          {['RETURN_REQUIRED', 'RETURNING'].includes(delivery.status)
            ? 'A devolução da carga deve ser acompanhada pela operação.'
            : ''}
        </p>
      ) : (
        <>
          <p>
            {delivery.pickedUpAt
              ? 'A carga já foi coletada. A solicitação exige devolução e permanece vinculada ao entregador até a confirmação pela operação.'
              : 'A solicitação cancela a entrega e invalida as ofertas relacionadas. O backend confirma se o estado atual permite a operação.'}
          </p>
          <form
            onSubmit={form.handleSubmit((data) => {
              mutation.reset();
              setReason(data.reason);
            })}
            noValidate
          >
            <FormField
              id="cancel-reason"
              label="Motivo do cancelamento"
              error={form.formState.errors.reason?.message}
            >
              <Textarea {...form.register('reason')} minLength={3} maxLength={500} required />
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>
              Solicitar cancelamento
            </Button>
          </form>
          <ConfirmDialog
            open={reason !== null}
            title="Confirmar cancelamento"
            description={`${delivery.pickedUpAt ? 'Solicitar a devolução desta entrega?' : 'Cancelar esta entrega?'} Motivo: ${reason ?? ''}`}
            loading={mutation.isPending}
            onCancel={() => setReason(null)}
            onConfirm={() => {
              if (reason) mutation.mutate(reason);
            }}
          />
        </>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {mutation.isSuccess && (
        <SuccessMessage>
          Solicitação confirmada: <StatusBadge status={mutation.data.status} />.
        </SuccessMessage>
      )}
    </Card>
  );
}
