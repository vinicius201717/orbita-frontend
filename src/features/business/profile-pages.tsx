'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Card, Table, StatusBadge, Button } from '@/components/ui';
import { ErrorState, LoadingState, EmptyState } from '@/components/feedback';
import { AccountSettings } from '@/features/auth/account-settings';
import { useAuth } from '@/providers/auth-provider';
import { useNotify } from '@/providers/notification-provider';
import { businessApi } from '@/services/api/business.api';
import { formatDate } from '@/lib/format';
import { BusinessForm, BranchForm } from './forms';
import { useBusiness, useBranches } from './queries';
import type { Branch } from './types';
export function BusinessProfile() {
  const { user } = useAuth();
  const query = useBusiness();
  const client = useQueryClient();
  const { notify } = useNotify();
  return (
    <>
      <PageHeader title="Perfil da empresa" />
      <Card title="Usuário">
        <dl>
          <dt>Nome</dt>
          <dd>{user?.name}</dd>
          <dt>E-mail</dt>
          <dd>{user?.email}</dd>
          <dt>Perfil</dt>
          <dd>{user?.role && <StatusBadge status={user.role} />}</dd>
        </dl>
      </Card>
      <AccountSettings />
      {!user?.businessId ? (
        <EmptyState title="Empresa não cadastrada">
          <Link href="/app/onboarding">Cadastrar empresa</Link>
        </EmptyState>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <Card title="Dados da empresa">
            {user.role === 'BUSINESS_OWNER' ? (
              <BusinessForm
                key={query.data.id}
                initialValues={query.data}
                onSubmit={async (data) => {
                  await businessApi.update(query.data.id, data);
                  await client.invalidateQueries({ queryKey: ['business'] });
                  notify('Dados da empresa atualizados.');
                }}
              />
            ) : (
              <dl>
                <dt>Razão social</dt>
                <dd>{query.data.legalName}</dd>
                <dt>Nome fantasia</dt>
                <dd>{query.data.tradeName}</dd>
                <dt>Documento</dt>
                <dd>{query.data.document}</dd>
                <dt>Telefone</dt>
                <dd>{query.data.phone}</dd>
                <dt>E-mail</dt>
                <dd>{query.data.email}</dd>
                <dt>Categoria</dt>
                <dd>
                  <StatusBadge status={query.data.category} />
                </dd>
              </dl>
            )}
            <p>
              Empresa {query.data.active ? 'ativa' : 'inativa'}. Cadastro em{' '}
              {formatDate(query.data.createdAt)}.
            </p>
          </Card>
        )
      )}
    </>
  );
}
export function BranchesPage() {
  const { user } = useAuth();
  const query = useBranches();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Branch | null>(null);
  const mutation = useMutation({ mutationFn: (branch: Branch) => businessApi.updateBranch(branch.businessId, branch.id, { active: !branch.active }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['business'] }); } });
  return (
    <>
      <PageHeader title="Unidades" description="Pontos de coleta cadastrados na empresa.">
        <Link href="/app/unidades/nova">Nova unidade</Link>
      </PageHeader>
      {!user?.businessId ? (
        <EmptyState title="Cadastre a empresa primeiro">
          <Link href="/app/onboarding">Configuração inicial</Link>
        </EmptyState>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <Table caption="Unidades da empresa">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Endereço</th>
              <th scope="col">Localização</th>
              <th scope="col">Situação</th>
              <th scope="col">Fuso horário</th>
              {user.role === 'BUSINESS_OWNER' && <th scope="col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {query.data.map((branch) => (
              <tr key={branch.id}>
                <th scope="row">{branch.name}</th>
                <td>{branch.address}</td>
                <td>
                  {branch.latitude}, {branch.longitude}
                </td>
                <td>{branch.active ? 'Ativa' : 'Inativa'}</td>
                <td>{branch.timezone}</td>
                {user.role === 'BUSINESS_OWNER' && <td><Button onClick={() => setEditing(branch)}>Editar</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate(branch)}>{branch.active ? 'Desativar' : 'Ativar'}</Button></td>}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="Nenhuma unidade cadastrada">
          <Link href="/app/unidades/nova">Cadastrar primeira unidade</Link>
        </EmptyState>
      )}
      {mutation.isError && <ErrorState error={mutation.error} />}
      {editing && <Card title={`Editar ${editing.name}`}><BranchForm key={editing.id} initialValues={editing} submitLabel="Salvar unidade" onSubmit={async (values) => { await businessApi.updateBranch(editing.businessId, editing.id, values); await client.invalidateQueries({ queryKey: ['business'] }); setEditing(null); }} /><Button onClick={() => setEditing(null)}>Cancelar edição</Button></Card>}
      <p>Até 100 unidades por empresa. Alterações de endereço valem para novas entregas; entregas existentes mantêm o ponto de coleta registrado.</p>
    </>
  );
}
export function NewBranchPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const { notify } = useNotify();
  return (
    <>
      <PageHeader title="Nova unidade" />
      {user?.businessId ? (
        <BranchForm
          onSubmit={async (data) => {
            await businessApi.createBranch(user.businessId!, data);
            await client.invalidateQueries({ queryKey: ['business'] });
            notify('Unidade cadastrada.');
            router.push('/app/unidades');
          }}
        />
      ) : (
        <EmptyState title="Cadastre a empresa primeiro">
          <Link href="/app/onboarding">Continuar configuração</Link>
        </EmptyState>
      )}
    </>
  );
}
