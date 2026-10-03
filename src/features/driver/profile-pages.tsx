'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, FormField, PageHeader, Select, StatusBadge, Table } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState, UnavailableFeature } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { useNotify } from '@/providers/notification-provider';
import { formatCurrency, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { driverKeys, useDriver, useDriverInvalidation } from './queries';
import { driverStatusSchema } from './schemas';
import type { DriverProfile, DriverStatus } from './types';
import { DRIVER_STATUS_LABELS, ONBOARDING_LABELS, VEHICLE_LABELS } from './labels';
import { VehicleForm } from './components/vehicle-form';
import { GpsControls } from './components/gps-controls';

export function DriverDashboard() {
  const driver = useDriver();
  const analytics = useQuery({ queryKey: driverKeys.analytics, queryFn: driverApi.analytics });
  const offers = useQuery({
    queryKey: driverKeys.offers,
    queryFn: driverApi.offers,
    refetchInterval: 15000,
  });
  return (
    <section className="page driver-dashboard">
      <PageHeader
        title="Painel do entregador"
        description="Acompanhe sua operação, oportunidades e ganhos."
      />
      {driver.isPending ? (
        <LoadingState />
      ) : driver.isError ? (
        <ErrorState error={driver.error} retry={() => void driver.refetch()} />
      ) : (
        <Card title="Minha operação">
          <p>
            Status: <StatusBadge status={driver.data.status} />
          </p>
          <p>Análise: {ONBOARDING_LABELS[driver.data.onboardingStatus]}</p>
          {driver.data.currentRouteId && (
            <Link href={`/app/entregador/rotas/${driver.data.currentRouteId}`}>Abrir rota atual</Link>
          )}
          <p>
            <Link href="/app/entregador/disponibilidade">Alterar disponibilidade</Link>
          </p>
        </Card>
      )}
      <Card title="Resumo acumulado">
        <p>
          Os indicadores disponíveis abrangem todo o histórico. Recortes de ganhos por dia, semana e mês
          ainda não são fornecidos pela API.
        </p>
        {analytics.isPending ? (
          <LoadingState />
        ) : analytics.isError ? (
          <ErrorState error={analytics.error} retry={() => void analytics.refetch()} />
        ) : (
          <dl>
            <dt>Ganhos</dt>
            <dd>{formatCurrency(analytics.data.earningsCents)}</dd>
            <dt>Entregas concluídas</dt>
            <dd>{analytics.data.deliveries}</dd>
            <dt>Rotas concluídas</dt>
            <dd>{analytics.data.routes}</dd>
            <dt>Distância estimada concluída</dt>
            <dd>{formatDistance(analytics.data.estimatedDistanceMeters)}</dd>
            <dt>Duração estimada concluída</dt>
            <dd>{formatDuration(analytics.data.estimatedDurationSeconds)}</dd>
          </dl>
        )}
      </Card>
      <Card title="Oportunidades">
        {offers.isPending ? (
          <LoadingState />
        ) : offers.isError ? (
          <ErrorState error={offers.error} retry={() => void offers.refetch()} />
        ) : (
          <p>{offers.data.length} oferta(s) disponível(is).</p>
        )}
        <Link href="/app/entregador/ofertas">Ver ofertas</Link>
      </Card>
      <nav aria-label="Atalhos do entregador">
        <ul>
          {[
            ['Rotas', 'rotas'],
            ['Ganhos', 'ganhos'],
            ['Veículo', 'veiculo'],
            ['Documentos', 'documentos'],
            ['Perfil', 'perfil'],
            ['Onboarding', 'onboarding'],
          ].map(([label, path]) => (
            <li key={path}>
              <Link href={`/app/entregador/${path}`}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function StatusForm({ driver }: { driver: DriverProfile }) {
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const form = useForm<{ status: DriverStatus }>({
    resolver: zodResolver(driverStatusSchema),
    defaultValues: { status: driver.status },
  });
  const mutation = useMutation({
    mutationFn: driverApi.status,
    onSuccess: async () => {
      await invalidate();
      notify('Disponibilidade atualizada.', 'success');
    },
  });
  const canOperate =
    driver.onboardingStatus === 'APPROVED' &&
    Boolean(driver.locationConsentAt) &&
    driver.vehicles.some((vehicle) => vehicle.active);
  const statusUnavailable = (status: string) =>
    status === 'AVAILABLE'
      ? !canOperate || Boolean(driver.currentRouteId)
      : status === 'ON_ROUTE'
        ? !canOperate || !driver.currentRouteId
        : status === 'OFFLINE' && Boolean(driver.currentRouteId);
  return (
    <form className="form" onSubmit={form.handleSubmit(({ status }) => mutation.mutate(status))}>
      <FormField
        id="driver-status"
        label="Disponibilidade"
        error={form.formState.errors.status?.message}
      >
        <Select id="driver-status" {...form.register('status')} disabled={mutation.isPending}>
          {Object.entries(DRIVER_STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status} disabled={statusUnavailable(status)}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      <Button type="submit" loading={mutation.isPending}>
        Atualizar disponibilidade
      </Button>
      {mutation.isError && <ErrorState error={mutation.error} />}
    </form>
  );
}
export function DriverAvailabilityPage() {
  const query = useDriver();
  return (
    <section className="page">
      <PageHeader
        title="Disponibilidade"
        description="A aprovação do cadastro, um veículo ativo e o consentimento de localização são necessários para operar."
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p>
            Status atual: <StatusBadge status={query.data.status} />
          </p>
          {query.data.onboardingStatus !== 'APPROVED' && (
            <p>
              Seu cadastro está {ONBOARDING_LABELS[query.data.onboardingStatus].toLowerCase()}. A
              operação ficará disponível após aprovação.
            </p>
          )}
          <StatusForm key={query.data.status} driver={query.data} />
          <GpsControls driver={query.data} />
        </>
      )}
    </section>
  );
}
export function DriverOnboardingPage() {
  const query = useDriver();
  return (
    <section className="page">
      <PageHeader title="Onboarding do entregador" />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p>Situação da análise: {ONBOARDING_LABELS[query.data.onboardingStatus]}.</p>
          <ul className="onboarding-checklist">
            <li>Conta: criada.</li>
            <li>Perfil e telefone: {query.data.phone ? 'cadastrados' : 'pendentes'}.</li>
            <li>
              Veículo ativo:{' '}
              {query.data.vehicles.some((vehicle) => vehicle.active) ? (
                'cadastrado'
              ) : (
                <Link href="/app/entregador/veiculo">cadastrar veículo</Link>
              )}
              .
            </li>
            <li>
              Documentos: <Link href="/app/entregador/documentos">envio indisponível na API atual</Link>.
            </li>
            <li>
              Localização:{' '}
              {query.data.locationConsentAt ? 'consentimento registrado' : 'consentimento pendente'}.
            </li>
            <li>WhatsApp: consulta e consentimento próprios indisponíveis.</li>
            <li>Aprovação ORBITA: {ONBOARDING_LABELS[query.data.onboardingStatus]}.</li>
          </ul>
          <GpsControls driver={query.data} />
          {query.data.onboardingStatus === 'REJECTED' && (
            <p>
              O cadastro foi rejeitado. A API atual não informa o motivo da revisão no perfil do
              entregador.
            </p>
          )}
        </>
      )}
    </section>
  );
}
export function DriverVehiclePage() {
  const query = useDriver();
  return (
    <section className="page">
      <PageHeader
        title="Veículo"
        description="Cadastre um novo veículo para substituir o ativo. Alterações durante uma rota são bloqueadas pelo servidor."
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.data.vehicles.length === 0 ? (
            <EmptyState title="Nenhum veículo cadastrado" />
          ) : (
            <Table caption="Veículos cadastrados">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Placa</th>
                  <th>Marca / modelo</th>
                  <th>Ano</th>
                  <th>Capacidade</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {query.data.vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{VEHICLE_LABELS[vehicle.type]}</td>
                    <td>{vehicle.plate}</td>
                    <td>
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Não informado'}
                    </td>
                    <td>{vehicle.year ?? 'Não informado'}</td>
                    <td>
                      {vehicle.capacityUnits} unidades
                      {vehicle.weightCapacityGrams ? ` / ${vehicle.weightCapacityGrams} g` : ''}
                      {vehicle.volumeCapacityCm3 ? ` / ${vehicle.volumeCapacityCm3} cm³` : ''}
                    </td>
                    <td>{vehicle.active ? 'Ativo' : 'Inativo'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {query.data.currentRouteId && (
            <p>Finalize ou resolva sua rota atual antes de cadastrar outro veículo.</p>
          )}
          <VehicleForm
            disabled={Boolean(query.data.currentRouteId)}
            replacing={query.data.vehicles.some((vehicle) => vehicle.active)}
          />
        </>
      )}
    </section>
  );
}
export function DriverProfilePage() {
  const { user } = useAuth();
  const query = useDriver();
  return (
    <section className="page">
      <PageHeader title="Perfil do entregador" />
      <Card title="Conta">
        <dl>
          <dt>Nome</dt>
          <dd>{user?.name ?? 'Não informado'}</dd>
          <dt>E-mail</dt>
          <dd>{user?.email ?? 'Não informado'}</dd>
        </dl>
      </Card>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Card title="Dados operacionais">
            <dl>
              <dt>Telefone</dt>
              <dd>{query.data.phone}</dd>
              <dt>Cadastro</dt>
              <dd>{ONBOARDING_LABELS[query.data.onboardingStatus]}</dd>
              <dt>Criado em</dt>
              <dd>{formatDate(query.data.createdAt)}</dd>
            </dl>
          </Card>
          <GpsControls driver={query.data} />
        </>
      )}
      <UnavailableFeature
        title="Edição de dados pessoais"
        description="A API atual não oferece edição do perfil do entregador nem alteração de senha."
      />
      <UnavailableFeature
        title="WhatsApp"
        description="O telefone cadastrado não comprova integração ativa. Consulta de verificação e registro de consentimento pelo entregador ainda dependem de endpoints específicos."
      />
    </section>
  );
}
