'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ExternalNavigationLinks } from '@/components/external-navigation-links';
import { formatCurrency, formatDate } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { useNotify } from '@/providers/notification-provider';
import { driverKeys, useDriverInvalidation } from './queries';
import { cancellationSchema, incidentSchema } from './schemas';
import { INCIDENT_LABELS } from './labels';
import { PinForm } from './components/pin-form';
import type { DriverDelivery } from './types';
import type { z } from 'zod';

function IncidentForm({ deliveryId }: { deliveryId: string }) {
  const form = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: 'OTHER', notes: '' },
  });
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof incidentSchema>) => driverApi.incident(deliveryId, data),
    onSuccess: () => {
      form.reset();
      notify('Incidente registrado.', 'success');
    },
    onSettled: invalidate,
  });
  return (
    <form
      className="form incident-form"
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
      noValidate
    >
      <fieldset disabled={mutation.isPending}>
        <legend>Registrar incidente</legend>
        <FormField id="incident-type" label="Tipo" error={form.formState.errors.type?.message}>
          <Select id="incident-type" {...form.register('type')}>
            {Object.entries(INCIDENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="incident-notes"
          label="Observações (opcional)"
          error={form.formState.errors.notes?.message}
        >
          <Textarea id="incident-notes" maxLength={2000} {...form.register('notes')} />
        </FormField>
        <Button type="submit" loading={mutation.isPending}>
          Registrar incidente
        </Button>
      </fieldset>
      {mutation.isError && <ErrorState error={mutation.error} />}
    </form>
  );
}
function CancellationForm({ delivery }: { delivery: DriverDelivery }) {
  const [reason, setReason] = useState<string | null>(null);
  const form = useForm<{ reason: string }>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: { reason: '' },
  });
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const mutation = useMutation({
    mutationFn: (value: string) => driverApi.cancel(delivery.id, value),
    onSuccess: () => {
      setReason(null);
      notify('Solicitação processada. Consulte o status atualizado.', 'success');
    },
    onSettled: invalidate,
  });
  return (
    <>
      <form
        className="form cancellation-form"
        onSubmit={form.handleSubmit((data) => setReason(data.reason))}
        noValidate
      >
        <FormField id="cancel-reason" label="Motivo" error={form.formState.errors.reason?.message}>
          <Textarea
            id="cancel-reason"
            maxLength={500}
            {...form.register('reason')}
            disabled={mutation.isPending}
          />
        </FormField>
        <Button type="submit" loading={mutation.isPending}>
          Solicitar cancelamento da atribuição
        </Button>
        {mutation.isError && <ErrorState error={mutation.error} />}
      </form>
      <ConfirmDialog
        open={reason !== null}
        title="Confirmar solicitação?"
        description={
          delivery.pickedUpAt
            ? 'O pedido já foi coletado. O servidor exigirá devolução e manterá a carga sob sua responsabilidade até a resolução.'
            : 'A entrega ainda não coletada será liberada para nova atribuição. Sua sequência de paradas será recalculada pelo servidor.'
        }
        onCancel={() => setReason(null)}
        onConfirm={() => {
          if (reason) mutation.mutate(reason);
        }}
        loading={mutation.isPending}
      />
    </>
  );
}
export function DriverDeliveryDetailPage({ id }: { id: string }) {
  const query = useQuery({ queryKey: driverKeys.delivery(id), queryFn: () => driverApi.delivery(id) });
  const incidents = useQuery({
    queryKey: driverKeys.incidents(id),
    queryFn: () => driverApi.incidents(id),
  });
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const returning = useMutation({
    mutationFn: () => driverApi.returning(id),
    onSuccess: () =>
      notify(
        'Retorno iniciado. A conclusão depende da confirmação administrativa de custódia.',
        'success',
      ),
    onSettled: invalidate,
  });
  if (query.isPending) return <LoadingState message="Carregando entrega..." />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const delivery = query.data;
  const terminal = ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(delivery.status);
  return (
    <section className="page driver-delivery-page">
      <PageHeader title={`Entrega ${id.slice(0, 8)}`} />
      <p>
        <StatusBadge status={delivery.status} />
      </p>
      {delivery.routeId && (
        <Link href={`/app/entregador/rotas/${delivery.routeId}`}>Consultar sequência da rota</Link>
      )}
      <Card title="Pedido">
        <ul>
          {delivery.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
        <p>
          Preparação:{' '}
          {delivery.readinessStatus === 'READY_FOR_PICKUP' ? 'pronto para coleta' : 'em preparação'}.
        </p>
        <p>
          Repasse: {formatCurrency(delivery.driverPayoutCents)}. Gorjeta:{' '}
          {formatCurrency(delivery.tipCents)}.
        </p>
      </Card>
      <Card title="Cliente e destino">
        <p>{delivery.customerName}</p>
        {delivery.customerPhone && (
          <p>Telefone disponibilizado pelo servidor: {delivery.customerPhone}</p>
        )}
        {delivery.complement && <p>Complemento: {delivery.complement}</p>}
        <ExternalNavigationLinks
          latitude={delivery.dropoffLatitude}
          longitude={delivery.dropoffLongitude}
        />
      </Card>
      <Card title="Coleta">
        <ExternalNavigationLinks
          latitude={delivery.pickupLatitude}
          longitude={delivery.pickupLongitude}
        />
        <p>Coletado em: {delivery.pickedUpAt ? formatDate(delivery.pickedUpAt) : 'Não coletado'}.</p>
      </Card>
      {delivery.status === 'ARRIVING' && (
        <Card title="Confirmar entrega">
          <PinForm deliveryId={id} />
        </Card>
      )}
      {delivery.deliveredAt && (
        <p role="status">Entrega concluída em {formatDate(delivery.deliveredAt)}.</p>
      )}
      {delivery.verifiedAt && <p>Confirmação registrada em {formatDate(delivery.verifiedAt)}.</p>}
      {delivery.status === 'RETURN_REQUIRED' && (
        <>
          <p>
            Esta carga precisa ser devolvida. A conclusão será registrada pela administração após a
            confirmação de custódia.
          </p>
          <Button onClick={() => returning.mutate()} loading={returning.isPending}>
            Iniciar retorno da carga
          </Button>
        </>
      )}
      {returning.isError && <ErrorState error={returning.error} />}
      <section aria-labelledby="incidents-heading">
        <h2 id="incidents-heading">Incidentes</h2>
        {incidents.isPending ? (
          <LoadingState />
        ) : incidents.isError ? (
          <ErrorState error={incidents.error} retry={() => void incidents.refetch()} />
        ) : incidents.data.length === 0 ? (
          <EmptyState title="Nenhum incidente registrado" />
        ) : (
          <ul>
            {incidents.data.map((incident) => (
              <li key={incident.id}>
                {INCIDENT_LABELS[incident.type as keyof typeof INCIDENT_LABELS] ?? incident.type} —{' '}
                {formatDate(incident.createdAt)}
                {incident.notes && <p>{incident.notes}</p>}
                <p>
                  {incident.resolvedAt
                    ? `Resolvido em ${formatDate(incident.resolvedAt)}`
                    : 'Sem resolução registrada'}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!terminal && <IncidentForm deliveryId={id} />}
      </section>
      {!terminal && !['RETURN_REQUIRED', 'RETURNING'].includes(delivery.status) && (
        <Card title="Cancelar atribuição">
          <CancellationForm delivery={delivery} />
        </Card>
      )}
      {delivery.cancellationReason && <p>Motivo registrado: {delivery.cancellationReason}</p>}
    </section>
  );
}
