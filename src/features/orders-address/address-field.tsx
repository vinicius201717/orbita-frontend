'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, FormField, Input } from '@/components/ui';
import { api } from '@/services/api/client';
import { ErrorState } from '@/components/feedback';
import { parseDestinationPoint } from './coordinates';
import styles from './address-field.module.css';

export type DeliveryAddress = { address: string; latitude: number; longitude: number };
type Candidate = DeliveryAddress & { approximate: boolean; source?: 'device' };
export function DeliveryAddressField({
  value,
  onChange,
  label = 'Endereço da entrega',
  allowCurrentPosition = false,
}: {
  value: DeliveryAddress | null;
  onChange: (value: DeliveryAddress | null) => void;
  label?: string;
  allowCurrentPosition?: boolean;
}) {
  const fieldId = useId();
  const [address, setAddress] = useState(value?.address ?? '');
  const [point, setPoint] = useState('');
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : '');
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : '');
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  function invalidatePoint() {
    revision.current++;
    setPending(false);
    setResults(null);
    setError(null);
    onChange(null);
  }
  function confirmPoint(destination: Pick<DeliveryAddress, 'latitude' | 'longitude'>) {
    revision.current++;
    setPending(false);
    setResults(null);
    setError(null);
    setPoint('');
    setLatitude(String(destination.latitude));
    setLongitude(String(destination.longitude));
    onChange({ address: address.trim(), ...destination });
  }
  function locate() {
    if (pending) return;
    if (address.trim().length < 8) { setError(new Error('Informe o endereço completo antes de localizar a unidade.')); return; }
    if (!navigator.geolocation) { setError(new Error('Este navegador não oferece localização. Busque o endereço ou use um ponto do mapa.')); return; }
    const current = ++revision.current;
    setPending(true); setError(null); setResults(null); onChange(null);
    navigator.geolocation.getCurrentPosition((position) => {
      if (current !== revision.current) return;
      setPending(false);
      setResults([{ address: address.trim(), latitude: position.coords.latitude, longitude: position.coords.longitude, approximate: true, source: 'device' }]);
    }, () => {
      if (current !== revision.current) return;
      setPending(false); setError(new Error('Não foi possível localizar o aparelho. Permita a localização ou busque o endereço.'));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  async function search() {
    if (pending) return;
    if (address.trim().length < 8) {
      setError(new Error('Informe rua, número, bairro e cidade.'));
      return;
    }
    const current = ++revision.current;
    setPending(true);
    setError(null);
    setResults(null);
    onChange(null);
    try {
      const data = await api.post<{ items: Candidate[] }>('/business/addresses/search', {
        address: address.trim(),
      });
      if (current === revision.current) setResults(data.items);
    } catch (cause) {
      if (current === revision.current) setError(cause);
    } finally {
      if (current === revision.current) setPending(false);
    }
  }
  function manual() {
    const destination = point.trim()
      ? parseDestinationPoint(point)
      : latitude.trim() && longitude.trim()
        ? parseDestinationPoint(`${latitude},${longitude}`)
        : null;
    if (address.trim().length < 8 || !destination) {
      setError(
        new Error(
          'Preencha o endereço e cole as coordenadas do ponto, como -16.6800, -49.2500, ou um link completo com o local marcado.',
        ),
      );
      return;
    }
    confirmPoint(destination);
  }
  return (
    <div className={styles.root}>
      <FormField
        id={`${fieldId}-address`}
        label={label}
        hint="Rua, número, bairro e cidade. Deixe apartamento e referência para o complemento."
      >
        <Input
          value={address}
          maxLength={300}
          autoComplete="street-address"
          placeholder="Ex.: Rua 9, 120, Centro, Goiânia, GO"
          onChange={(event) => {
            setAddress(event.target.value);
            setPoint('');
            setLatitude('');
            setLongitude('');
            invalidatePoint();
          }}
        />
      </FormField>
      <Button loading={pending} onClick={() => void search()}>
        Buscar endereço
      </Button>
      {allowCurrentPosition && <><Button disabled={pending} onClick={locate}>Estou na unidade: localizar aparelho</Button><small>Use somente se estiver no local de coleta. Confira o ponto no mapa antes de confirmar.</small></>}
      {!!error && <ErrorState error={error} />}
      {results && (
        <div className={styles.results} aria-live="polite">
          {results.length ? (
            <>
              <p>Confira o ponto no mapa e confirme o local:</p>
              <ul>
                {results.map((result, index) => (
                  <li key={index}>
                    <strong>{result.address}</strong>
                    {result.approximate && (
                      <p>Local aproximado. Confira o número e o ponto no mapa antes de escolher.</p>
                    )}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${result.latitude},${result.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Conferir no mapa ↗
                    </a>
                    <Button
                      onClick={() => confirmPoint({ latitude: result.latitude, longitude: result.longitude })}
                    >
                      Confirmar este local
                    </Button>
                  </li>
                ))}
              </ul>
              <small>{results.some((result) => result.source === 'device') ? 'Localização do aparelho; não confirma o endereço automaticamente.' : 'Resultados do Google Maps'}</small>
            </>
          ) : (
            <p>Nenhum local encontrado. Confira o endereço ou use um ponto do mapa abaixo.</p>
          )}
        </div>
      )}
      <details className={styles.manual}>
        <summary>Usar um ponto do Google Maps</summary>
        <p>
          Abra o mapa, procure o endereço e clique com o botão direito no ponto exato. Clique nas
          coordenadas para copiar e cole abaixo. No celular, mantenha o dedo no ponto para ver as
          coordenadas.
        </p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Brasil')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir endereço no Google Maps ↗
        </a>
        <FormField
          id={`${fieldId}-point`}
          label="Coordenadas ou link completo do ponto"
          hint="Links curtos de compartilhamento precisam ser abertos no mapa primeiro."
        >
          <Input
            value={point}
            placeholder="-16.6800, -49.2500"
            onChange={(event) => {
              setPoint(event.target.value);
              setLatitude('');
              setLongitude('');
              invalidatePoint();
            }}
          />
        </FormField>
        <div className={styles.coordinates}>
          <FormField id={`${fieldId}-latitude`} label="Latitude" hint="Entre -90 e 90.">
            <Input
              type="number"
              step="any"
              value={latitude}
              inputMode="decimal"
              onChange={(event) => {
                setLatitude(event.target.value);
                setPoint('');
                invalidatePoint();
              }}
            />
          </FormField>
          <FormField id={`${fieldId}-longitude`} label="Longitude" hint="Entre -180 e 180.">
            <Input
              type="number"
              step="any"
              value={longitude}
              inputMode="decimal"
              onChange={(event) => {
                setLongitude(event.target.value);
                setPoint('');
                invalidatePoint();
              }}
            />
          </FormField>
        </div>
        <Button onClick={manual}>Confirmar este ponto</Button>
      </details>
      {value && (
        <div className={styles.confirmed} role="status">
          <strong>✓ Local confirmado</strong>
          <span>{value.address}</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver local no mapa ↗
          </a>
        </div>
      )}
    </div>
  );
}
