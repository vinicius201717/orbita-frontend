'use client';
import { useForm } from 'react-hook-form';
import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button, FormField, Input } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { driverApi } from '@/services/api/driver.api';
import { useNotify } from '@/providers/notification-provider';
import { pinSchema } from '../schemas';
import { useDriverInvalidation } from '../queries';

export function PinForm({ deliveryId, disabled = false }: { deliveryId: string; disabled?: boolean }) {
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const requestInFlight = useRef(false);
  const form = useForm<{ code: string }>({
    resolver: zodResolver(pinSchema),
    defaultValues: { code: '' },
  });
  const mutation = useMutation({
    mutationFn: (code: string) => driverApi.verify(deliveryId, code),
    onSuccess: () => {
      form.reset();
      notify('Entrega confirmada pelo servidor.', 'success');
    },
    onSettled: async () => {
      try {
        await invalidate();
      } finally {
        requestInFlight.current = false;
      }
    },
  });
  const errorCode = mutation.error && 'code' in mutation.error ? mutation.error.code : null;
  const locked = errorCode === 'PIN_LOCKED';
  const specificMessage =
    errorCode === 'PIN_INVALID'
      ? 'Código incorreto. Confira com o cliente antes de tentar novamente.'
      : locked
        ? 'Limite de tentativas atingido. A confirmação precisa de resolução pela operação.'
        : errorCode === 'DELIVERY_TOO_FAR'
          ? 'Sua localização está fora do raio permitido. Atualize sua localização quando chegar ao destino.'
          : errorCode === 'LOCATION_REQUIRED'
            ? 'O servidor precisa de uma localização atual para confirmar esta entrega. Envie sua localização na página de disponibilidade e tente novamente após a atualização.'
            : null;
  const unavailable = disabled || locked || mutation.isPending || mutation.isSuccess;
  return (
    <form
      className="form pin-form"
      onSubmit={(event) => {
        void form.handleSubmit(({ code }) => {
          if (unavailable || requestInFlight.current) return;
          requestInFlight.current = true;
          mutation.mutate(code);
        })(event);
      }}
      noValidate
    >
      <p>
        Peça o código ao cliente somente ao entregar o pedido. O código nunca é disponibilizado ao
        entregador pela aplicação.
      </p>
      <FormField
        id={`pin-${deliveryId}`}
        label="Código informado pelo cliente"
        error={form.formState.errors.code?.message}
      >
        <Input
          id={`pin-${deliveryId}`}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          {...form.register('code')}
          disabled={unavailable}
        />
      </FormField>
      <Button type="submit" disabled={unavailable} loading={mutation.isPending}>
        Confirmar entrega
      </Button>
      {specificMessage ? (
        <p role="alert">{specificMessage}</p>
      ) : mutation.isError ? (
        <ErrorState error={mutation.error} />
      ) : null}
      {mutation.isSuccess && <p role="status">Entrega confirmada.</p>}
    </form>
  );
}
