'use client';
import { useRef, useState } from 'react';
import { Button, FormField, Input } from '@/components/ui';
import { api } from '@/services/api/client';
import { ErrorState } from '@/components/feedback';
import { parseDestinationPoint } from './coordinates';
import styles from './address-field.module.css';

export type DeliveryAddress = { address: string; latitude: number; longitude: number };
type Candidate = DeliveryAddress & { approximate: boolean };
export function DeliveryAddressField({
  value,
  onChange,
  label = 'Endereço da entrega',
}: {
  value: DeliveryAddress | null;
  onChange: (value: DeliveryAddress | null) => void;
  label?: string;
}) {
  const [address, setAddress] = useState(value?.address ?? '');
  const [point, setPoint] = useState('');
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const revision = useRef(0);
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
    const destination = parseDestinationPoint(point);
    if (address.trim().length < 8 || !destination) {
      setError(
        new Error(
          'Preencha o endereço e cole as coordenadas do ponto, como -16.6800, -49.2500, ou um link completo com o local marcado.',
        ),
      );
      return;
    }
    revision.current++;
    setPending(false);
    setError(null);
    setResults(null);
    onChange({ address: address.trim(), ...destination });
  }
  return (
    <div className={styles.root}>
      <FormField
        id="order-address"
        label={label}
        hint="Rua, número, bairro e cidade. Deixe apartamento e referência para o complemento."
      >
        <Input
          value={address}
          maxLength={300}
          autoComplete="street-address"
          placeholder="Ex.: Rua 9, 120, Centro, Goiânia, GO"
          onChange={(event) => {
            revision.current++;
            setPending(false);
            setAddress(event.target.value);
            onChange(null);
            setResults(null);
            setError(null);
          }}
        />
      </FormField>
      <Button loading={pending} onClick={() => void search()}>
        Buscar endereço
      </Button>
      {!!error && <ErrorState error={error} />}
      {results && (
        <div className={styles.results} aria-live="polite">
          {results.length ? (
            <>
              <p>Confira o local e selecione o destino:</p>
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
                      onClick={() => {
                        onChange({
                          address: address.trim(),
                          latitude: result.latitude,
                          longitude: result.longitude,
                        });
                        setResults(null);
                      }}
                    >
                      Usar este destino
                    </Button>
                  </li>
                ))}
              </ul>
              <small>Resultados do Google Maps</small>
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
          id="order-address-point"
          label="Coordenadas ou link completo do ponto"
          hint="Links curtos de compartilhamento precisam ser abertos no mapa primeiro."
        >
          <Input
            value={point}
            placeholder="-16.6800, -49.2500"
            onChange={(event) => {
              setPoint(event.target.value);
              onChange(null);
            }}
          />
        </FormField>
        <Button onClick={manual}>Confirmar este ponto</Button>
      </details>
      {value && (
        <div className={styles.confirmed} role="status">
          <strong>✓ Destino confirmado</strong>
          <span>{value.address}</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver ponto da entrega ↗
          </a>
        </div>
      )}
    </div>
  );
}
