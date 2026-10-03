'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, ConfirmDialog } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { driverApi } from '@/services/api/driver.api';
import { useNotify } from '@/providers/notification-provider';
import { formatDate } from '@/lib/format';
import { useDriverInvalidation } from '../queries';
import type { DriverProfile } from '../types';

export function GpsControls({ driver }: { driver: DriverProfile }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<Error | null>(null);
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const consent = useMutation({
    mutationFn: driverApi.consent,
    onSuccess: async ({ granted }) => {
      await invalidate();
      setConfirmRevoke(false);
      notify(
        granted
          ? 'Consentimento de localização registrado.'
          : 'Consentimento revogado. Operação pausada.',
        'success',
      );
    },
  });
  const location = useMutation({
    mutationFn: driverApi.location,
    onSuccess: async ({ accepted }) => {
      await invalidate();
      notify(
        accepted
          ? 'Localização recebida. A atualização do perfil será processada pelo servidor.'
          : 'O servidor já possui uma localização mais recente.',
        accepted ? 'success' : 'info',
      );
    },
  });
  function captureLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(new Error('Este navegador não disponibiliza geolocalização.'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        location.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        setLocating(false);
        setLocationError(
          new Error(
            error.code === 1
              ? 'Permissão de localização negada. Altere a permissão do navegador se desejar enviar sua posição.'
              : 'Não foi possível obter uma posição atual. Tente novamente em um local com sinal.',
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  const operational = ['AVAILABLE', 'ON_ROUTE'].includes(driver.status);
  return (
    <section className="gps-controls" aria-labelledby="gps-title">
      <h2 id="gps-title">Localização operacional</h2>
      <p>
        Rastreamento contínuo em segundo plano deverá ser realizado pelo aplicativo companion
        Android/iOS. Este site envia apenas uma posição quando você solicita.
      </p>
      <p>
        Consentimento:{' '}
        {driver.locationConsentAt
          ? `registrado em ${formatDate(driver.locationConsentAt)}`
          : 'não registrado'}
        .
      </p>
      <p>
        Última posição: {driver.lastLocationAt ? formatDate(driver.lastLocationAt) : 'nenhuma'} —{' '}
        {driver.presence === 'FRESH' ? 'atualizada' : 'desatualizada'}.
      </p>
      <div className="page-actions">
        {driver.locationConsentAt ? (
          <Button onClick={() => setConfirmRevoke(true)} loading={consent.isPending}>
            Revogar consentimento de localização
          </Button>
        ) : (
          <Button onClick={() => consent.mutate(true)} loading={consent.isPending}>
            Autorizar localização durante a operação
          </Button>
        )}
        <Button
          onClick={captureLocation}
          disabled={!driver.locationConsentAt || !operational}
          loading={locating || location.isPending}
        >
          Enviar minha localização atual
        </Button>
      </div>
      {!operational && <p>Para enviar sua posição, o status precisa estar disponível ou em rota.</p>}
      {consent.isError && <ErrorState error={consent.error} />}
      {location.isError && <ErrorState error={location.error} />}
      {locationError && <ErrorState error={locationError} />}
      <ConfirmDialog
        open={confirmRevoke}
        title="Revogar localização?"
        description="O servidor pausará sua operação, desativará novas ofertas e removerá a localização atual. As entregas sob sua responsabilidade continuam atribuídas."
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => consent.mutate(false)}
        loading={consent.isPending}
      />
    </section>
  );
}
