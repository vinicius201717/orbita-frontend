'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { useNotify } from '@/providers/notification-provider';
import { PageHeader, Card } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/feedback';
import { businessApi } from '@/services/api/business.api';
import { deliveryApi } from '@/services/api/delivery.api';
import { BusinessForm, BranchForm } from './forms';
import { useBranches } from './queries';
export function BusinessOnboarding() {
  const { user, refresh } = useAuth();
  const branches = useBranches();
  const client = useQueryClient();
  const { notify } = useNotify();
  const deliveries = useQuery({
    queryKey: ['deliveries', 'onboarding', user?.businessId],
    queryFn: () => deliveryApi.list({ limit: 1 }),
    enabled: !!user?.businessId,
  });
  return (
    <>
      <PageHeader
        title="Configuração inicial da empresa"
        description="Complete os dados para registrar e acompanhar entregas."
      />
      <ol className="onboarding-checklist">
        <li>Conta: {user ? 'criada' : 'aguardando autenticação'}</li>
        <li>Empresa: {user?.businessId ? 'cadastrada' : 'pendente'}</li>
        <li>
          Unidade:{' '}
          {branches.data?.length ? 'cadastrada' : branches.isFetching ? 'verificando' : 'pendente'}
        </li>
        <li>
          WhatsApp: verificação não disponível para consulta.{' '}
          <Link href="/app/whatsapp">Ver orientações</Link>
        </li>
        <li>
          Documentos: envie os arquivos solicitados pela operação.{' '}
          <Link href="/app/empresa/documentos">Ver documentos</Link>
        </li>
        <li>
          Primeira entrega:{' '}
          {deliveries.data?.items.length
            ? 'registrada'
            : deliveries.isFetching
              ? 'verificando'
              : 'pendente'}
        </li>
      </ol>
      {!user?.businessId ? (
        <Card title="Cadastrar empresa">
          {user?.role === 'BUSINESS_OWNER' ? (
            <BusinessForm
              submitLabel="Cadastrar empresa"
              onSubmit={async (data) => {
                await businessApi.create(data);
                await refresh();
                await client.invalidateQueries({ queryKey: ['business'] });
                notify('Empresa cadastrada. Continue com a primeira unidade.');
              }}
            />
          ) : (
            <p>Solicite ao responsável a vinculação de sua conta a uma empresa.</p>
          )}
        </Card>
      ) : branches.isPending ? (
        <LoadingState />
      ) : branches.error ? (
        <ErrorState error={branches.error} retry={() => void branches.refetch()} />
      ) : !branches.data?.length ? (
        <Card title="Cadastrar primeira unidade">
          <BranchForm
            onSubmit={async (data) => {
              await businessApi.createBranch(user.businessId!, data);
              await client.invalidateQueries({ queryKey: ['business'] });
              notify('Primeira unidade cadastrada.');
            }}
          />
        </Card>
      ) : (
        <Card title="Pronto para registrar entregas">
          <Link href="/app/entregas/nova">Criar primeira entrega</Link>
          {' · '}
          <Link href="/app">Ir para o painel</Link>
        </Card>
      )}
      {deliveries.error && (
        <ErrorState error={deliveries.error} retry={() => void deliveries.refetch()} />
      )}
    </>
  );
}
