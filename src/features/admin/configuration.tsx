'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, ConfirmDialog, PageHeader } from '@/components/ui';
import { ErrorState, LoadingState, SuccessMessage, UnavailableFeature } from '@/components/feedback';
import { formatCurrency, formatDistance } from '@/lib/format';
import { adminApi } from '@/services/api/admin.api';
import { RecordFields } from './shared';

export function AdminConfiguration() {
  const client = useQueryClient();
  const matching = useQuery({
    queryKey: ['admin', 'matching-config'],
    queryFn: adminApi.matchingConfig,
  });
  const pricing = useQuery({ queryKey: ['admin', 'pricing-rules'], queryFn: adminApi.pricingRules });
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: adminApi.runMatching,
    onError: () => setConfirm(false),
    onSuccess: async () => {
      setConfirm(false);
      await client.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  return (
    <section className="admin-configuration">
      <PageHeader
        title="Configuração"
        description="Parâmetros efetivos retornados pelo backend, disponíveis somente para consulta."
      />
      <Card title="Distribuição de entregas">
        {matching.isPending ? (
          <LoadingState />
        ) : matching.isError ? (
          <ErrorState error={matching.error} retry={() => void matching.refetch()} />
        ) : (
          <RecordFields
            items={[
              { label: 'Raio de busca', value: formatDistance(matching.data.radiusMeters) },
              { label: 'Limite de candidatos', value: matching.data.candidateLimit },
              { label: 'Limite de entregas por rota', value: matching.data.maxDeliveries },
              {
                label: 'Inserção dinâmica',
                value: matching.data.dynamicInsertion ? 'Ativa' : 'Inativa',
              },
              { label: 'Múltiplas coletas', value: matching.data.multiPickup ? 'Ativas' : 'Inativas' },
            ]}
          />
        )}
      </Card>
      <Card title="Regras de valores">
        {pricing.isPending ? (
          <LoadingState />
        ) : pricing.isError ? (
          <ErrorState error={pricing.error} retry={() => void pricing.refetch()} />
        ) : (
          <RecordFields
            items={[
              { label: 'Receita base', value: formatCurrency(pricing.data.baseRevenueCents) },
              { label: 'Repasse base', value: formatCurrency(pricing.data.basePayoutCents) },
              { label: 'Mínimo por quilômetro', value: formatCurrency(pricing.data.minimumCentsPerKm) },
              { label: 'Mínimo por hora', value: formatCurrency(pricing.data.minimumCentsPerHour) },
              { label: 'Pagamentos reais', value: 'Desativados' },
            ]}
          />
        )}
      </Card>
      <UnavailableFeature
        title="Alterar parâmetros"
        description="Não existe endpoint de edição de configurações ou precificação. A alteração depende da configuração do backend."
      />
      <Card title="Reavaliar fila de entregas">
        <p>
          Solicita uma nova avaliação das entregas elegíveis. O backend pode gerar ofertas aos
          entregadores conforme as regras atuais.
        </p>
        <Button loading={mutation.isPending} onClick={() => setConfirm(true)}>
          Reavaliar fila agora
        </Button>
        {mutation.isError && <ErrorState error={mutation.error} />}
        {mutation.isSuccess && (
          <SuccessMessage>
            Reavaliação concluída. Consulte as entregas e rotas para acompanhar os resultados; a execução
            não garante a criação de ofertas.
          </SuccessMessage>
        )}
        <ConfirmDialog
          open={confirm}
          title="Reavaliar fila de entregas?"
          description="Essa operação executa o matching e pode gerar novas ofertas aos entregadores elegíveis."
          loading={mutation.isPending}
          onCancel={() => setConfirm(false)}
          onConfirm={() => mutation.mutate()}
        />
      </Card>
      <nav aria-label="Consultas administrativas adicionais">
        <ul>
          <li>
            <Link href="/admin/metricas">Métricas da plataforma</Link>
          </li>
          <li>
            <Link href="/admin/auditoria">Auditoria</Link>
          </li>
          <li>
            <Link href="/admin/alertas">Sinais de fraude</Link>
          </li>
          <li>
            <Link href="/admin/privacidade">Solicitações de privacidade</Link>
          </li>
        </ul>
      </nav>
    </section>
  );
}
