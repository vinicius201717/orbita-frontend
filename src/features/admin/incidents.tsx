'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FormField, Textarea } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { statusLabel } from '@/constants/status';
import { formatDate } from '@/lib/format';
import { adminApi } from '@/services/api/admin.api';
import { AdminRecordList, EntityLink, RecordFields } from './shared';
import type { AdminIncident } from './types';
function ResolveIncident({ incident }: { incident: AdminIncident }) {
  const [resolution, setResolution] = useState('');
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => adminApi.resolveIncident(incident.deliveryId, incident.id, resolution.trim()), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'incidents'] }); } });
  if (incident.resolvedAt) return <span>Resolvido</span>;
  return <details><summary>Resolver incidente</summary><form onSubmit={(event) => { event.preventDefault(); if (resolution.trim().length >= 3) mutation.mutate(); }}><FormField id={`resolution-${incident.id}`} label="Como o incidente foi resolvido"><Textarea value={resolution} minLength={3} maxLength={2000} required onChange={(event) => setResolution(event.target.value)} /></FormField><p>A resolução fica registrada na auditoria e não altera o estado da entrega.</p><Button type="submit" loading={mutation.isPending}>Registrar resolução</Button></form>{mutation.isError && <ErrorState error={mutation.error} />}</details>;
}

function IncidentContext({ deliveryId }: { deliveryId: string }) {
  const [opened, setOpened] = useState(false);
  const query = useQuery({
    queryKey: ['admin', 'delivery', deliveryId],
    queryFn: () => adminApi.delivery(deliveryId),
    enabled: opened,
  });
  return (
    <div className="incident-context">
      <Button aria-expanded={opened} onClick={() => setOpened(!opened)}>
        {opened ? 'Ocultar responsáveis' : 'Consultar responsáveis'}
      </Button>
      {opened &&
        (query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          <RecordFields
            items={[
              { label: 'Empresa', value: <EntityLink kind="empresas" id={query.data.businessId} /> },
              {
                label: 'Entregador atual',
                value: <EntityLink kind="entregadores" id={query.data.driverId} />,
              },
            ]}
          />
        ))}
    </div>
  );
}

export function AdminIncidents() {
  return (
    <AdminRecordList<AdminIncident>
      title="Incidentes"
      resource="incidents"
      description="Os responsáveis consultados correspondem ao vínculo atual da entrega, que pode ter mudado após o incidente."
      columns={[
        { title: 'Incidente', render: (incident) => incident.id.slice(0, 8) },
        { title: 'Tipo', render: (incident) => statusLabel(incident.type) },
        {
          title: 'Entrega',
          render: (incident) => <EntityLink kind="entregas" id={incident.deliveryId} />,
        },
        {
          title: 'Responsáveis',
          render: (incident) => <IncidentContext deliveryId={incident.deliveryId} />,
        },
        { title: 'Data', render: (incident) => formatDate(incident.createdAt) },
        { title: 'Notas', render: (incident) => incident.notes ?? 'Sem notas' },
        {
          title: 'Situação',
          render: (incident) =>
            incident.resolvedAt ? `Resolvido em ${formatDate(incident.resolvedAt)}` : 'Em aberto',
        },
        { title: 'Resolução', render: (incident) => incident.resolution ?? 'Não registrada' },
        { title: 'Ações', render: (incident) => <ResolveIncident incident={incident} /> },
        {
          title: 'Referências de anexos',
          render: (incident) =>
            incident.attachments.length ? (
              <ul>
                {incident.attachments.map((attachment, index) => (
                  <li key={`${index}-${attachment}`}>{attachment}</li>
                ))}
              </ul>
            ) : (
              'Nenhuma'
            ),
        },
      ]}
    />
  );
}
