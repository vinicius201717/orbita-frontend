'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, FormField, Textarea } from '@/components/ui';
import { ErrorState, SuccessMessage } from '@/components/feedback';
import { deliveryApi } from '@/services/api/delivery.api';
import type { Delivery } from '@/features/deliveries/types';
import { canCancelOrder, canMarkOrderReady } from './order-state';
import styles from './orders.module.css';

export function OrderActions({ delivery, compact = false }: { delivery: Delivery; compact?: boolean }) {
  const client = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh() {
    await Promise.all(
      ['merchant-orders', 'deliveries', 'business'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }
  const ready = useMutation({
    mutationFn: () => deliveryApi.ready(delivery.id),
    onSuccess: async () => {
      setNotice('Pedido pronto para coleta.');
      await refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: () => deliveryApi.cancel(delivery.id, reason.trim()),
    onSuccess: async (result) => {
      setConfirm(false);
      setCancelling(false);
      setNotice(
        result.status === 'RETURN_REQUIRED'
          ? 'Devolução solicitada. Acompanhe os próximos passos na entrega.'
          : 'Pedido cancelado.',
      );
      await refresh();
    },
  });
  const pending = ready.isPending || cancel.isPending;
  return (
    <div className={styles.actions}>
      {canMarkOrderReady(delivery) && (
        <Button
          className={styles.primary}
          loading={ready.isPending}
          disabled={pending}
          onClick={() => ready.mutate()}
        >
          Marcar como pronto
        </Button>
      )}
      {!compact && canCancelOrder(delivery) && (
        <Button disabled={pending} onClick={() => setCancelling(!cancelling)}>
          {cancelling
            ? 'Manter pedido'
            : delivery.pickedUpAt
              ? 'Solicitar devolução'
              : 'Cancelar pedido'}
        </Button>
      )}
      {cancelling && (
        <div className={styles.cancelForm}>
          <FormField
            id={`cancel-${delivery.id}`}
            label="Motivo"
            hint="Explique brevemente o motivo para a equipe de entrega."
          >
            <Textarea
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
          <Button disabled={reason.trim().length < 3 || pending} onClick={() => setConfirm(true)}>
            Revisar cancelamento
          </Button>
        </div>
      )}
      {!!ready.error && <ErrorState error={ready.error} />}
      {!!cancel.error && <ErrorState error={cancel.error} />}
      {!!notice && <SuccessMessage>{notice}</SuccessMessage>}
      <ConfirmDialog
        open={confirm}
        title={delivery.pickedUpAt ? 'Solicitar a devolução?' : 'Cancelar este pedido?'}
        description={
          delivery.pickedUpAt
            ? 'O pedido já foi coletado. A entrega entrará no fluxo de devolução ao estabelecimento.'
            : 'A entrega será cancelada e o pedido ficará no histórico. Esta ação não apaga os produtos.'
        }
        loading={cancel.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  );
}
