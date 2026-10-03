'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, ConfirmDialog, PageHeader } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { formatCurrency, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { driverApi } from '@/services/api/driver.api';
import { useNotify } from '@/providers/notification-provider';
import { driverKeys, useDriverInvalidation } from './queries';
import type { DriverOffer } from './types';
import { secondsUntilExpiry } from './offer-state';

function OfferCard({
  offer,
  busy,
  onAccept,
  onReject,
}: {
  offer: DriverOffer;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = secondsUntilExpiry(offer.expiresAt, now);
  return (
    <Card title={offer.offerType === 'INSERTION' ? 'Adicionar entregas à sua rota' : 'Nova rota'}>
      <dl>
        <dt>Entregas</dt>
        <dd>{offer.deliveryCount}</dd>
        <dt>Distância adicional</dt>
        <dd>{formatDistance(offer.additionalDistanceMeters)}</dd>
        <dt>Duração adicional</dt>
        <dd>{formatDuration(offer.additionalDurationSeconds)}</dd>
        <dt>Ganho oferecido</dt>
        <dd>{formatCurrency(offer.offeredPayoutCents)}</dd>
        <dt>Validade</dt>
        <dd>
          <time dateTime={offer.expiresAt}>{formatDate(offer.expiresAt)}</time> —{' '}
          {seconds > 0 ? `${seconds} segundos restantes` : 'expirada'}
        </dd>
      </dl>
      {offer.approximatePickup && (
        <p>
          Região aproximada de coleta: {offer.approximatePickup.latitude},{' '}
          {offer.approximatePickup.longitude}.
        </p>
      )}
      <div className="offer-actions">
        <Button disabled={busy || seconds === 0} onClick={onAccept}>
          Aceitar oferta
        </Button>
        <Button disabled={busy || seconds === 0} onClick={onReject}>
          Recusar oferta
        </Button>
      </div>
    </Card>
  );
}
export function DriverOffersPage() {
  const query = useQuery({
    queryKey: driverKeys.offers,
    queryFn: driverApi.offers,
    refetchInterval: 15000,
  });
  const [rejectId, setRejectId] = useState<string | null>(null);
  // Prevent two clicks in one render from creating concurrent requests.
  const requestInFlight = useRef(false);
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const router = useRouter();
  const settled = async () => {
    try {
      await invalidate();
    } finally {
      requestInFlight.current = false;
    }
  };
  const accept = useMutation({
    mutationFn: driverApi.accept,
    onSuccess: (result) => {
      notify('Oferta aceita. Consulte a sequência atualizada de paradas.', 'success');
      if (result.routeId) router.push(`/app/entregador/rotas/${result.routeId}`);
    },
    onSettled: settled,
  });
  const reject = useMutation({
    mutationFn: driverApi.reject,
    onSuccess: ({ changed }) => {
      setRejectId(null);
      notify(changed ? 'Oferta recusada.' : 'A oferta já havia sido encerrada.', 'info');
    },
    onSettled: settled,
  });
  const handleResponse = useCallback(
    (id: string, action: 'accept' | 'reject') => {
      if (requestInFlight.current) return;
      const offer = query.data?.find((item) => item.id === id);
      if (!offer || secondsUntilExpiry(offer.expiresAt, Date.now()) === 0) {
        setRejectId(null);
        notify('Esta oferta expirou ou foi encerrada. Atualize as ofertas.', 'info');
        void query.refetch();
        return;
      }
      requestInFlight.current = true;
      if (action === 'accept') accept.mutate(id);
      else reject.mutate(id);
    },
    [accept, notify, query, reject],
  );
  return (
    <section className="page offers-page">
      <PageHeader
        title="Ofertas"
        description="A disponibilidade e as condições são confirmadas pelo servidor no momento do aceite."
      />
      <p>Os dados completos dos clientes e da rota ficam disponíveis após o aceite.</p>
      <Button onClick={() => void query.refetch()} loading={query.isFetching}>
        Atualizar ofertas
      </Button>
      {accept.isPending && <LoadingState message="Confirmando oferta..." />}
      {accept.isError && <ErrorState error={accept.error} />}
      {reject.isError && <ErrorState error={reject.error} />}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Nenhuma oferta disponível"
          description="Mantenha sua operação disponível e a localização atualizada para receber oportunidades."
        />
      ) : (
        query.data.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            busy={accept.isPending || reject.isPending}
            onAccept={() => handleResponse(offer.id, 'accept')}
            onReject={() => setRejectId(offer.id)}
          />
        ))
      )}
      <ConfirmDialog
        open={rejectId !== null}
        title="Recusar esta oferta?"
        description="A oferta será encerrada para você. O servidor decidirá novas oportunidades disponíveis."
        onCancel={() => setRejectId(null)}
        onConfirm={() => {
          if (rejectId) handleResponse(rejectId, 'reject');
        }}
        loading={reject.isPending || accept.isPending}
      />
    </section>
  );
}
