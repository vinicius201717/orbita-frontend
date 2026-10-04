'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, PageHeader, StatusBadge, Table } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { DocumentsPanel } from '@/features/documents/documents-panel';
import { formatDate } from '@/lib/format';
import { adminApi } from '@/services/api/admin.api';
import { AdminRecordList, EntityLink, RecordFields } from './shared';
import type { AdminBusiness } from './types';

export function AdminBusinesses() {
  return (
    <AdminRecordList<AdminBusiness>
      title="Empresas"
      resource="businesses"
      columns={[
        {
          title: 'Nome fantasia',
          render: (business) => (
            <EntityLink kind="empresas" id={business.id}>
              {business.tradeName}
            </EntityLink>
          ),
        },
        { title: 'Razão social', render: (business) => business.legalName },
        { title: 'Categoria', render: (business) => <StatusBadge status={business.category} /> },
        { title: 'Situação', render: (business) => (business.active ? 'Ativa' : 'Inativa') },
        { title: 'Telefone', render: (business) => business.phone },
        { title: 'Criada em', render: (business) => formatDate(business.createdAt) },
      ]}
    />
  );
}

export function AdminBusinessDetail({ id }: { id: string }) {
  const business = useQuery({
    queryKey: ['admin', 'business', id],
    queryFn: () => adminApi.business(id),
  });
  const branches = useQuery({
    queryKey: ['admin', 'business', id, 'branches'],
    queryFn: () => adminApi.branches(id),
  });
  return (
    <section className="admin-business-detail">
      <PageHeader title="Detalhes da empresa">
        <Link href="/admin/empresas">Voltar para empresas</Link>
      </PageHeader>
      {business.isPending ? (
        <LoadingState />
      ) : business.isError ? (
        <ErrorState error={business.error} retry={() => void business.refetch()} />
      ) : (
        <>
          <Card title={business.data.tradeName}>
            <RecordFields
              items={[
                { label: 'ID', value: business.data.id },
                { label: 'Razão social', value: business.data.legalName },
                { label: 'Documento', value: business.data.document },
                { label: 'Telefone cadastrado', value: business.data.phone },
                { label: 'E-mail', value: business.data.email },
                { label: 'Categoria', value: <StatusBadge status={business.data.category} /> },
                { label: 'Ativa', value: business.data.active ? 'Sim' : 'Não' },
                {
                  label: 'Modalidade de cobrança',
                  value: business.data.billingMode === 'PREPAID' ? 'Pré-pago' : 'Pós-pago',
                },
                { label: 'Criada em', value: formatDate(business.data.createdAt) },
              ]}
            />
          </Card>
          <Link href={`/admin/entregas?businessId=${id}`}>Ver entregas da empresa</Link>
          <Link href="/admin/whatsapp">Consultar identidades e consentimento do WhatsApp</Link>
          <DocumentsPanel entityType="BUSINESS" entityId={id} review />
        </>
      )}
      <section aria-labelledby="admin-branches-title">
        <h2 id="admin-branches-title">Unidades</h2>
        {branches.isPending ? (
          <LoadingState />
        ) : branches.isError ? (
          <ErrorState error={branches.error} retry={() => void branches.refetch()} />
        ) : branches.data.length === 0 ? (
          <EmptyState title="Nenhuma unidade cadastrada" />
        ) : (
          <Table caption="Unidades da empresa (até 100 registros)">
            <thead>
              <tr>
                <th scope="col">Unidade</th>
                <th scope="col">Endereço</th>
                <th scope="col">Coordenadas</th>
                <th scope="col">Fuso horário</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {branches.data.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td>{branch.address}</td>
                  <td>
                    {branch.latitude}, {branch.longitude}
                  </td>
                  <td>{branch.timezone}</td>
                  <td>{branch.active ? 'Ativa' : 'Inativa'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </section>
  );
}
