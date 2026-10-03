'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, PageHeader, Table } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { adminApi } from '@/services/api/admin.api';
import type { AdminResource } from './types';

export interface AdminColumn<T> {
  title: string;
  render: (item: T, cursor: string | undefined) => ReactNode;
}

export function EntityLink({
  kind,
  id,
  children,
}: {
  kind: 'empresas' | 'entregadores' | 'entregas' | 'rotas';
  id: string | null;
  children?: ReactNode;
}) {
  return id ? (
    <Link href={`/admin/${kind}/${id}`}>{children ?? id.slice(0, 8)}</Link>
  ) : (
    <>Não vinculado</>
  );
}

export function AdminRecordList<T extends { id: string }>({
  title,
  description,
  resource,
  columns,
  children,
}: {
  title: string;
  description?: string;
  resource: AdminResource;
  columns: AdminColumn<T>[];
  children?: ReactNode;
}) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const query = useQuery({
    queryKey: ['admin', resource, { cursor }],
    queryFn: () => adminApi.list<T>(resource, cursor),
  });
  return (
    <section className="admin-resource-page">
      <PageHeader title={title} description={description} />
      {children}
      <Button type="button" loading={query.isFetching} onClick={() => void query.refetch()}>
        Atualizar lista
      </Button>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="Nenhum registro nesta página" />
      ) : (
        <Table caption={`${title} — página ${cursors.length}`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.title} scope="col">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.data.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.title}>{column.render(row, cursor)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <nav aria-label={`Paginação de ${title}`} className="pagination">
        <Button
          type="button"
          disabled={cursors.length === 1 || query.isFetching}
          onClick={() => setCursors((items) => items.slice(0, -1))}
        >
          Anterior
        </Button>
        <span aria-live="polite">Página {cursors.length}</span>
        <Button
          type="button"
          disabled={query.isFetching || !query.data || query.data.length < 50}
          onClick={() => {
            const next = query.data?.at(-1)?.id;
            if (next) setCursors((items) => [...items, next]);
          }}
        >
          Próxima
        </Button>
      </nav>
      <p>A API retorna até 50 registros por página, sem total. A última página pode ser vazia.</p>
    </section>
  );
}

export function RecordFields({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="record-fields">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? 'Não informado'}</dd>
        </div>
      ))}
    </dl>
  );
}
