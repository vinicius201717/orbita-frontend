'use client';

import { UnavailableFeature } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { AdminRecordList, EntityLink } from './shared';
import type { AuditEntry, FraudFlag, PrivacyRequest } from './types';

function Details({ value }: { value: unknown }) {
  return value === null || value === undefined ? (
    <>Não informados</>
  ) : (
    <details>
      <summary>Consultar dados</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export function AdminAudit() {
  return (
    <AdminRecordList<AuditEntry>
      title="Auditoria"
      resource="audit"
      columns={[
        { title: 'ID', render: (entry) => entry.id },
        { title: 'Data', render: (entry) => formatDate(entry.createdAt) },
        { title: 'Ação', render: (entry) => entry.action },
        { title: 'Usuário', render: (entry) => entry.actorId ?? 'Sistema' },
        { title: 'Entidade', render: (entry) => `${entry.entityType}: ${entry.entityId}` },
        { title: 'Dados', render: (entry) => <Details value={entry.metadata} /> },
      ]}
    />
  );
}

export function AdminFraudFlags() {
  return (
    <AdminRecordList<FraudFlag>
      title="Sinais de fraude"
      resource="fraud-flags"
      description="Sinais técnicos para revisão. Um registro não comprova fraude."
      columns={[
        { title: 'Tipo', render: (flag) => flag.type },
        { title: 'Data', render: (flag) => formatDate(flag.createdAt) },
        { title: 'Entregador', render: (flag) => <EntityLink kind="entregadores" id={flag.driverId} /> },
        { title: 'Entrega', render: (flag) => <EntityLink kind="entregas" id={flag.deliveryId} /> },
        { title: 'Dados', render: (flag) => <Details value={flag.metadata} /> },
      ]}
    />
  );
}

export function AdminPrivacyRequests() {
  return (
    <AdminRecordList<PrivacyRequest>
      title="Solicitações de privacidade"
      resource="privacy-requests"
      columns={[
        { title: 'Solicitação', render: (request) => request.id },
        { title: 'Usuário', render: (request) => request.userId },
        {
          title: 'Tipo',
          render: (request) =>
            request.type === 'EXPORT'
              ? 'Exportação'
              : request.type === 'DELETE'
                ? 'Exclusão'
                : request.type,
        },
        { title: 'Status', render: (request) => request.status },
        { title: 'Criada em', render: (request) => formatDate(request.createdAt) },
        { title: 'Concluída em', render: (request) => formatDate(request.completedAt) },
      ]}
    >
      <UnavailableFeature
        title="Processar solicitação"
        description="A consulta está disponível; não há endpoint para exportar dados, concluir exclusão ou alterar a situação de uma solicitação."
      />
    </AdminRecordList>
  );
}
