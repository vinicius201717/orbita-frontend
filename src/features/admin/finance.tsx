'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Button, Card, ConfirmDialog, FormField, Input, Table, Textarea } from '@/components/ui';
import { ErrorState, LoadingState, UnavailableFeature } from '@/components/feedback';
import { formatCurrency, formatDate } from '@/lib/format';
import { statusLabel } from '@/constants/status';
import { useNotify } from '@/providers/notification-provider';
import { adminApi } from '@/services/api/admin.api';
import { adjustmentSchema } from './schemas';
import { AdminRecordList, RecordFields } from './shared';
import type { LedgerTransaction } from './types';

const adjustmentFormSchema = adjustmentSchema.omit({ idempotencyKey: true });
type Adjustment = z.infer<typeof adjustmentSchema>;

function FinanceTotals() {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });
  return (
    <Card title="Totais de entregas concluídas">
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <RecordFields
          items={[
            { label: 'GMV logístico', value: formatCurrency(query.data.logisticsGmvCents) },
            { label: 'Receita bruta logística', value: formatCurrency(query.data.grossRevenueCents) },
            { label: 'Repasses', value: formatCurrency(query.data.driverPayoutsCents) },
            { label: 'Margem bruta', value: formatCurrency(query.data.grossMarginCents) },
          ]}
        />
      )}
    </Card>
  );
}

function AdjustmentForm() {
  const queryClient = useQueryClient();
  const { notify } = useNotify();
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState<Adjustment | null>(null);
  const form = useForm<z.infer<typeof adjustmentFormSchema>>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { walletId: '', amountCents: 0, reason: '' },
  });
  const mutation = useMutation({
    mutationFn: adminApi.adjust,
    onError: () => setPending(null),
    onSuccess: async (transaction) => {
      setPending(null);
      key.current = null;
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'financial-transactions'] });
      notify(`Ajuste registrado. Transação ${transaction.id}.`, 'success');
    },
  });
  return (
    <Card title="Ajuste de carteira">
      <p>
        Informe o ID de uma carteira de empresa ou entregador. Valor positivo credita; valor negativo
        debita. O registro terá contrapartida na plataforma e ficará na auditoria.
      </p>
      <p>
        Não há busca administrativa de carteiras. Use um ID verificado em um lançamento existente ou
        fornecido pelo responsável pela operação.
      </p>
      <form
        className="form"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            key.current ??= crypto.randomUUID();
            setPending({ ...values, idempotencyKey: key.current });
          })(event)
        }
      >
        <FormField
          id="adjust-wallet"
          label="ID da carteira"
          error={form.formState.errors.walletId?.message}
        >
          <Input id="adjust-wallet" {...form.register('walletId')} />
        </FormField>
        <FormField
          id="adjust-amount"
          label="Valor em centavos"
          hint="Exemplo: 1000 representa R$ 10,00 de crédito; -1000 representa R$ 10,00 de débito."
          error={form.formState.errors.amountCents?.message}
        >
          <Input
            id="adjust-amount"
            type="number"
            step="1"
            min={-10000000}
            max={10000000}
            {...form.register('amountCents', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          id="adjust-reason"
          label="Motivo do ajuste"
          error={form.formState.errors.reason?.message}
        >
          <Textarea id="adjust-reason" maxLength={500} {...form.register('reason')} />
        </FormField>
        <Button type="submit" loading={mutation.isPending}>
          Revisar ajuste
        </Button>
      </form>
      {mutation.isError && (
        <>
          <ErrorState error={mutation.error} />
          <p>
            Em caso de falha de comunicação, mantenha os mesmos dados e tente novamente. A mesma chave de
            operação será reutilizada para evitar lançamentos duplicados.
          </p>
        </>
      )}
      <ConfirmDialog
        open={pending !== null}
        title="Confirmar ajuste financeiro"
        description={
          pending
            ? `${pending.amountCents > 0 ? 'Creditar' : 'Debitar'} ${formatCurrency(Math.abs(pending.amountCents))} na carteira ${pending.walletId}. Motivo: ${pending.reason}. O lançamento não poderá ser editado ou apagado.`
            : ''
        }
        loading={mutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) mutation.mutate(pending);
        }}
      />
    </Card>
  );
}

function TransactionEntries({ transaction }: { transaction: LedgerTransaction }) {
  return (
    <details>
      <summary>Ver {transaction.entries.length} lançamentos</summary>
      <Table caption={`Lançamentos da transação ${transaction.id}`}>
        <thead>
          <tr>
            <th scope="col">Carteira</th>
            <th scope="col">Tipo</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {transaction.entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.walletId}</td>
              <td>{statusLabel(entry.type)}</td>
              <td>{formatCurrency(entry.amountCents)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </details>
  );
}

export function AdminFinance() {
  return (
    <AdminRecordList<LedgerTransaction>
      title="Financeiro"
      resource="financial-transactions"
      description="Valores em reais, convertidos dos centavos retornados pelo backend. Os lançamentos são imutáveis."
      columns={[
        { title: 'Transação', render: (transaction) => transaction.id },
        { title: 'Data', render: (transaction) => formatDate(transaction.createdAt) },
        {
          title: 'Referência',
          render: (transaction) => `${transaction.referenceType}: ${transaction.referenceId}`,
        },
        { title: 'Descrição', render: (transaction) => transaction.description ?? 'Sem descrição' },
        {
          title: 'Lançamentos',
          render: (transaction) => <TransactionEntries transaction={transaction} />,
        },
      ]}
    >
      <FinanceTotals />
      <AdjustmentForm />
      <UnavailableFeature
        title="Pagamentos e edição de lançamentos"
        description="Esta integração registra e consulta o ledger. Não há pagamentos reais, PIX, saques ou edição de lançamentos."
      />
    </AdminRecordList>
  );
}
