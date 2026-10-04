'use client';
import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, FormField, Input, Select, StatusBadge, Table, Textarea } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { api, requestJson } from '@/services/api/client';
import { formatDate } from '@/lib/format';
import { useNotify } from '@/providers/notification-provider';

type Owner = { entityType: 'BUSINESS' | 'DRIVER'; entityId: string };
type DocumentRecord = Owner & {
  id: string;
  type: string;
  fileName: string;
  sizeBytes: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  reviewNotes: string | null;
  replacesId: string | null;
};
type Policy = {
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
  types: string[];
  requiredTypes: string[];
};
const labels: Record<string, string> = {
  IDENTITY: 'Identificação',
  VEHICLE: 'Veículo',
  BUSINESS: 'Empresa',
  OTHER: 'Outro',
};

function DocumentReview({
  document,
  onReviewed,
}: {
  document: DocumentRecord;
  onReviewed: () => Promise<void>;
}) {
  const id = useId();
  const mutation = useMutation({
    mutationFn: (body: { status: string; notes: string }) =>
      api.patch(`/documents/${document.id}/review`, body),
    onSuccess: onReviewed,
  });
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        mutation.mutate({ status: String(data.get('status')), notes: String(data.get('notes')) });
      }}
    >
      <FormField id={id + 'status'} label="Resultado">
        <Select name="status" defaultValue="APPROVED">
          <option value="APPROVED">Aprovado</option>
          <option value="REJECTED">Rejeitado</option>
        </Select>
      </FormField>
      <FormField id={id + 'notes'} label="Parecer da análise">
        <Textarea
          name="notes"
          required
          minLength={3}
          maxLength={1000}
          defaultValue={document.reviewNotes || ''}
        />
      </FormField>
      <Button type="submit" loading={mutation.isPending}>
        Salvar análise
      </Button>
      {mutation.error && <ErrorState error={mutation.error} />}
    </form>
  );
}

export function DocumentsPanel({ entityType, entityId, review = false }: Owner & { review?: boolean }) {
  const id = useId();
  const client = useQueryClient();
  const { notify } = useNotify();
  const [replacement, setReplacement] = useState<DocumentRecord | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const queryKey = ['documents', entityType, entityId];
  const documents = useQuery({
    queryKey,
    queryFn: () => api.get<DocumentRecord[]>('/documents', { entityType, entityId }),
  });
  const policy = useQuery({
    queryKey: ['documents', 'policy'],
    queryFn: () => api.get<Policy>('/documents/policy'),
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey });
  };
  const upload = useMutation({
    mutationFn: (body: FormData) =>
      requestJson<DocumentRecord>('/api/backend/documents', { method: 'POST', body }),
    onSuccess: async () => {
      await refresh();
      setReplacement(null);
      notify('Documento enviado para análise.');
    },
  });
  return (
    <section aria-label="Documentos" className="documents-page">
      <Card title="Documentos">
        {documents.isPending ? (
          <LoadingState />
        ) : documents.error ? (
          <ErrorState error={documents.error} retry={() => void documents.refetch()} />
        ) : documents.data.length === 0 ? (
          <EmptyState
            title="Nenhum documento enviado"
            description="Envie os arquivos solicitados pela equipe de operação."
          />
        ) : (
          <Table caption="Documentos enviados (até 100 versões recentes)">
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th>Envio / validade</th>
                <th>Análise</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.data.map((document) => (
                <tr key={document.id}>
                  <td>
                    {document.fileName}
                    <small>
                      {' '}
                      · {Math.ceil(document.sizeBytes / 1024)} KB
                      {document.replacesId ? ' · Reenvio' : ''}
                    </small>
                  </td>
                  <td>{labels[document.type] || document.type}</td>
                  <td>
                    <StatusBadge status={document.status} />
                  </td>
                  <td>
                    {formatDate(document.createdAt)}
                    <br />
                    {document.expiresAt
                      ? `Validade: ${formatDate(document.expiresAt)}`
                      : 'Sem validade informada'}
                  </td>
                  <td>
                    {document.reviewNotes || 'Aguardando análise'}
                    {review && (
                      <details>
                        <summary>Revisar documento</summary>
                        <DocumentReview document={document} onReviewed={refresh} />
                      </details>
                    )}
                  </td>
                  <td>
                    <a href={`/api/backend/documents/${document.id}/content`} download>
                      Baixar arquivo
                    </a>
                    {!review && (
                      <Button
                        onClick={() => {
                          setReplacement(document);
                          setValidation(null);
                        }}
                      >
                        Reenviar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {!review && (
        <Card title={replacement ? `Reenviar: ${replacement.fileName}` : 'Enviar documento'}>
          {policy.isPending ? (
            <LoadingState />
          ) : policy.error ? (
            <ErrorState error={policy.error} retry={() => void policy.refetch()} />
          ) : (
            <form
              key={replacement?.id || 'new'}
              className="form"
              onSubmit={async (event) => {
                event.preventDefault();
                setValidation(null);
                const form = event.currentTarget;
                const data = new FormData(form);
                const file = data.get('file');
                if (!(file instanceof File) || !file.size) {
                  setValidation('Escolha um arquivo.');
                  return;
                }
                if (file.size > policy.data.maxBytes || !policy.data.mimeTypes.includes(file.type)) {
                  setValidation('Escolha PDF, JPG ou PNG de até 5 MB.');
                  return;
                }
                data.set('entityType', entityType);
                data.set('entityId', entityId);
                if (replacement) {
                  data.set('replacesId', replacement.id);
                  data.set('type', replacement.type);
                }
                const expires = String(data.get('expiresAt') || '');
                if (expires) data.set('expiresAt', new Date(expires + 'T12:00:00Z').toISOString());
                else data.delete('expiresAt');
                try {
                  await upload.mutateAsync(data);
                  form.reset();
                } catch {
                  /* Error is displayed below. */
                }
              }}
            >
              <p>
                PDF, JPG ou PNG · até {policy.data.maxBytes / (1024 * 1024)} MB. Os arquivos são privados
                e acessíveis à equipe de análise.
              </p>
              <FormField id={id + 'type'} label="Tipo do documento">
                <Select
                  name="type"
                  defaultValue={replacement?.type || policy.data.types[0]}
                  disabled={!!replacement}
                >
                  {policy.data.types.map((type) => (
                    <option key={type} value={type}>
                      {labels[type] || type}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField id={id + 'file'} label="Arquivo">
                <Input type="file" name="file" accept={policy.data.extensions.join(',')} required />
              </FormField>
              <FormField id={id + 'expires'} label="Validade (opcional)">
                <Input type="date" name="expiresAt" />
              </FormField>
              <div className="page-actions">
                <Button type="submit" loading={upload.isPending}>
                  Enviar documento
                </Button>
                {replacement && <Button onClick={() => setReplacement(null)}>Cancelar reenvio</Button>}
              </div>
              {validation && <p role="alert">{validation}</p>}
              {upload.error && <ErrorState error={upload.error} />}
            </form>
          )}
        </Card>
      )}
    </section>
  );
}
