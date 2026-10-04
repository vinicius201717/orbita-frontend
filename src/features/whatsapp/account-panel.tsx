'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/ui';
import { ErrorState, LoadingState, SuccessMessage } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/services/api/client';
import { formatDate } from '@/lib/format';

type WhatsAppStatus = { phoneNumber: string; verifiedAt: string | null; optInAt: string | null; providerEnabled: boolean; ready: boolean };
export function WhatsAppAccountPanel() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['whatsapp', 'me'], queryFn: () => api.get<WhatsAppStatus>('/whatsapp/me'), enabled: Boolean(user?.driverId || user?.businessId) });
  const mutation = useMutation({ mutationFn: (granted: boolean) => api.post<WhatsAppStatus>('/whatsapp/me/consent', { granted }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['whatsapp'] }); } });
  if (!user?.driverId && !user?.businessId) return <Card title="WhatsApp"><p>Complete o cadastro para gerenciar este canal.</p></Card>;
  return <Card title="WhatsApp operacional">
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <>
      <dl><dt>Telefone</dt><dd>{query.data.phoneNumber}</dd><dt>Verificação da identidade</dt><dd>{query.data.verifiedAt ? `Verificada em ${formatDate(query.data.verifiedAt)}` : 'Pendente de análise da equipe ORBITA'}</dd><dt>Consentimento</dt><dd>{query.data.optInAt ? `Autorizado em ${formatDate(query.data.optInAt)}` : 'Não autorizado'}</dd><dt>Canal de mensagens</dt><dd>{query.data.ready ? 'Habilitado para este cadastro' : query.data.providerEnabled ? 'Aguardando verificação e consentimento' : 'Aguardando configuração da operação'}</dd></dl>
      <p>Ao autorizar, você permite o uso deste telefone para comandos e avisos sobre suas entregas. Você pode revogar a autorização a qualquer momento.</p>
      {user?.role !== 'BUSINESS_STAFF' && <Button loading={mutation.isPending} onClick={() => mutation.mutate(!query.data.optInAt)}>{query.data.optInAt ? 'Revogar autorização' : 'Autorizar WhatsApp'}</Button>}
    </>}
    {mutation.isError && <ErrorState error={mutation.error} />}
    {mutation.isSuccess && <SuccessMessage>Consentimento atualizado.</SuccessMessage>}
  </Card>;
}
