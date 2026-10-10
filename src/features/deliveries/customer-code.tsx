'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, ConfirmDialog } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { deliveryApi } from '@/services/api/delivery.api';
import styles from './customer-code.module.css';

const active = new Set([
  'CREATED',
  'WAITING_POOL',
  'MATCHING',
  'OFFERED',
  'ASSIGNED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVING',
]);
export function CustomerCode({ id, status }: { id: string; status: string }) {
  const { user } = useAuth();
  const permitted = !!user && ['BUSINESS_OWNER', 'BUSINESS_STAFF', 'ADMIN'].includes(user.role) && active.has(status);
  return permitted ? <PrivateCode key={`${id}:${user.id}`} id={id} /> : null;
}
function PrivateCode({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof deliveryApi.customerCode>> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const revision = useRef(0);
  const invalidate = () => { revision.current += 1; };
  useEffect(() => {
    const hide = () => { if (document.hidden) { revision.current++; setResult(null); setPending(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { invalidate(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 60000);
    return () => clearTimeout(timer);
  }, [result]);
  async function reveal() {
    if (pending) return;
    const current = ++revision.current;
    setConfirm(false); setPending(true); setError(null);
    try { const value = await deliveryApi.customerCode(id); if (current === revision.current) setResult(value); }
    catch (cause) { if (current === revision.current) setError(cause); }
    finally { if (current === revision.current) setPending(false); }
  }
  return <Card title="Código privado do cliente">
    <p>Envie este código diretamente ao cliente por um canal combinado com ele. O cliente deve informá-lo ao entregador somente após receber o pedido.</p>
    <p>Consultar aqui não confirma envio por WhatsApp. Não coloque o código na embalagem nem o envie ao entregador.</p>
    {result ? <div className={styles.revealed}>
      <output className={styles.code} aria-label="Código privado do cliente">{result.code}</output>
      <p>{result.instructions}</p>
      <small>O código será ocultado em um minuto ou ao sair desta aba.</small>
      <Button onClick={() => setResult(null)}>Ocultar código</Button>
    </div> : <Button onClick={() => setConfirm(true)} loading={pending}>Consultar código do cliente</Button>}
    {!!error && <ErrorState error={error} />}
    <ConfirmDialog open={confirm} title="Consultar código privado" description="Consulte somente para encaminhar diretamente ao cliente. A consulta é registrada. Se for necessário substituir um código antigo, você será avisado." onCancel={() => setConfirm(false)} onConfirm={() => void reveal()} loading={pending} />
  </Card>;
}
