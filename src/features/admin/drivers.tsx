'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  PageHeader,
  Select,
  StatusBadge,
} from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { DocumentsPanel } from '@/features/documents/documents-panel';
import { formatDate } from '@/lib/format';
import { useNotify } from '@/providers/notification-provider';
import { adminApi } from '@/services/api/admin.api';
import { AdminRecordList, EntityLink, RecordFields } from './shared';
import type { AdminDriver, OnboardingStatus } from './types';

const reviewSchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) });
const reviewLabels: Record<OnboardingStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export function AdminDrivers() {
  return (
    <AdminRecordList<AdminDriver>
      title="Entregadores"
      resource="drivers"
      description="Consulte o perfil, os veículos e os documentos antes de revisar o cadastro."
      columns={[
        {
          title: 'Entregador',
          render: (driver, cursor) => (
            <Link
              href={`/admin/entregadores/${driver.id}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`}
            >
              {driver.id.slice(0, 8)}
            </Link>
          ),
        },
        { title: 'Telefone', render: (driver) => driver.phone },
        { title: 'Análise', render: (driver) => <StatusBadge status={driver.onboardingStatus} /> },
        { title: 'Disponibilidade', render: (driver) => <StatusBadge status={driver.status} /> },
        { title: 'Confiabilidade', render: (driver) => driver.reliabilityScore },
        {
          title: 'Capacidade usada / máxima',
          render: (driver) => `${driver.currentCapacityUnits} / ${driver.maxCapacityUnits} unidades`,
        },
        {
          title: 'Rota atual',
          render: (driver) => <EntityLink kind="rotas" id={driver.currentRouteId} />,
        },
      ]}
    />
  );
}

function ReviewForm({ driver }: { driver: AdminDriver }) {
  const queryClient = useQueryClient();
  const { notify } = useNotify();
  const [confirmation, setConfirmation] = useState<OnboardingStatus | null>(null);
  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { status: driver.onboardingStatus },
  });
  const mutation = useMutation({
    mutationFn: (status: OnboardingStatus) => adminApi.reviewDriver(driver.id, status),
    onError: () => setConfirmation(null),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'driver', updated.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      setConfirmation(null);
      notify('Análise do entregador registrada.', 'success');
    },
  });
  return (
    <Card title="Análise de onboarding">
      <p>
        Confira os dados cadastrais, veículos e documentos antes de decidir.
      </p>
      <form className="form" onSubmit={form.handleSubmit(({ status }) => setConfirmation(status))}>
        <FormField
          id="driver-review-status"
          label="Resultado da análise"
          error={form.formState.errors.status?.message}
        >
          <Select id="driver-review-status" {...form.register('status')}>
            {Object.entries(reviewLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" loading={mutation.isPending}>
          Revisar entregador
        </Button>
      </form>
      {mutation.isError && <ErrorState error={mutation.error} />}
      <ConfirmDialog
        open={confirmation !== null}
        title="Confirmar análise"
        description={`Alterar a análise para ${confirmation ? reviewLabels[confirmation] : ''}? A decisão será registrada em auditoria. Aprovar não coloca o entregador automaticamente disponível.`}
        loading={mutation.isPending}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation) mutation.mutate(confirmation);
        }}
      />
    </Card>
  );
}

export function AdminDriverDetail({ id }: { id: string; cursor?: string }) {
  const query = useQuery({
    queryKey: ['admin', 'driver', id],
    queryFn: () => adminApi.driver(id),
  });
  return (
    <section className="admin-driver-detail">
      <PageHeader title="Detalhes do entregador">
        <Link href="/admin/entregadores">Voltar para entregadores</Link>
      </PageHeader>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Card title="Cadastro e operação">
            <RecordFields
              items={[
                { label: 'ID', value: query.data.id },
                { label: 'Usuário', value: query.data.userId },
                { label: 'Nome', value: query.data.user.name },
                { label: 'E-mail', value: query.data.user.email },
                { label: 'Conta ativa', value: query.data.user.active ? 'Sim' : 'Não' },
                { label: 'Telefone', value: query.data.phone },
                { label: 'Onboarding', value: <StatusBadge status={query.data.onboardingStatus} /> },
                { label: 'Disponibilidade', value: <StatusBadge status={query.data.status} /> },
                { label: 'Aceita novas entregas', value: query.data.acceptNewOrders ? 'Sim' : 'Não' },
                { label: 'Confiabilidade', value: query.data.reliabilityScore },
                {
                  label: 'Capacidade utilizada / máxima',
                  value: `${query.data.currentCapacityUnits} / ${query.data.maxCapacityUnits} unidades`,
                },
                {
                  label: 'Consentimento de localização',
                  value: formatDate(query.data.locationConsentAt),
                },
                { label: 'Última localização', value: formatDate(query.data.lastLocationAt) },
                {
                  label: 'Rota atual',
                  value: <EntityLink kind="rotas" id={query.data.currentRouteId} />,
                },
                { label: 'Criado em', value: formatDate(query.data.createdAt) },
              ]}
            />
          </Card>
          <Card title="Veículos">
            {query.data.vehicles.length ? query.data.vehicles.map((vehicle) => <p key={vehicle.id}>{vehicle.plate} · {vehicle.brand} {vehicle.model} · {vehicle.capacityUnits} unidades · {vehicle.active ? 'Ativo' : 'Inativo'}</p>) : <p>Nenhum veículo cadastrado.</p>}
          </Card>
          <DocumentsPanel entityType="DRIVER" entityId={id} review />
          <ReviewForm key={`${query.data.id}-${query.data.onboardingStatus}`} driver={query.data} />
          <Link href={`/admin/entregas?driverId=${query.data.id}`}>Ver entregas deste entregador</Link>
        </>
      )}
    </section>
  );
}
