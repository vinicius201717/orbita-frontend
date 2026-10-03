'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Button, Card, FormField, Input, PageHeader, Table, Textarea } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState, UnavailableFeature } from '@/components/feedback';
import { useNotify } from '@/providers/notification-provider';
import { adminApi } from '@/services/api/admin.api';
import { polygonSchema, zoneSchema } from './schemas';

export function AdminZones() {
  const client = useQueryClient();
  const { notify } = useNotify();
  const query = useQuery({ queryKey: ['admin', 'zones'], queryFn: adminApi.zones });
  const form = useForm<z.infer<typeof zoneSchema>>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { name: '', city: '', boundary: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof zoneSchema>) =>
      adminApi.createZone({ ...values, boundary: polygonSchema.parse(JSON.parse(values.boundary)) }),
    onSuccess: async () => {
      form.reset();
      await client.invalidateQueries({ queryKey: ['admin', 'zones'] });
      notify('Zona cadastrada.', 'success');
    },
  });
  return (
    <section className="admin-zones">
      <PageHeader
        title="Zonas de atendimento"
        description="Até 100 zonas retornadas pelo backend. A validação geográfica definitiva ocorre no servidor."
      />
      <Button loading={query.isFetching} onClick={() => void query.refetch()}>
        Atualizar zonas
      </Button>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.length ? (
        <EmptyState title="Nenhuma zona cadastrada" />
      ) : (
        <Table caption="Zonas cadastradas">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Cidade</th>
              <th scope="col">Status</th>
              <th scope="col">Limite geográfico</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((zone) => (
              <tr key={zone.id}>
                <td>{zone.name}</td>
                <td>{zone.city}</td>
                <td>{zone.active ? 'Ativa' : 'Inativa'}</td>
                <td>
                  <details>
                    <summary>Consultar GeoJSON</summary>
                    <pre>{JSON.stringify(zone.boundary, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Card title="Cadastrar zona">
        <form className="form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField id="zone-name" label="Nome" error={form.formState.errors.name?.message}>
            <Input id="zone-name" maxLength={100} {...form.register('name')} />
          </FormField>
          <FormField id="zone-city" label="Cidade" error={form.formState.errors.city?.message}>
            <Input id="zone-city" maxLength={100} {...form.register('city')} />
          </FormField>
          <FormField
            id="zone-boundary"
            label="Limite GeoJSON"
            hint="Objeto Polygon com coordenadas [longitude, latitude]. Cada anel precisa ter pelo menos quatro posições e terminar no ponto inicial."
            error={form.formState.errors.boundary?.message}
          >
            <Textarea
              id="zone-boundary"
              rows={10}
              spellCheck={false}
              maxLength={100000}
              {...form.register('boundary')}
            />
          </FormField>
          <Button type="submit" loading={mutation.isPending}>
            Cadastrar zona
          </Button>
        </form>
        {mutation.isError && <ErrorState error={mutation.error} />}
      </Card>
      <UnavailableFeature
        title="Editar ou desativar zona"
        description="A API oferece criação e consulta. Alteração e desativação de zonas ainda não estão disponíveis."
      />
    </section>
  );
}
