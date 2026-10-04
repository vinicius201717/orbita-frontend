'use client';
import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui';
import { UnavailableFeature, ErrorState, LoadingState } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { DocumentsPanel } from '@/features/documents/documents-panel';
import { WhatsAppAccountPanel } from '@/features/whatsapp/account-panel';
import { useBusiness } from './queries';
export function BusinessWhatsApp() {
  const { user } = useAuth();
  const query = useBusiness();
  return (
    <>
      <PageHeader title="WhatsApp" description="Informações sobre os comandos operacionais." />
      {!!user?.businessId &&
        (query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          <p>Telefone cadastrado na empresa: {query.data?.phone}</p>
        ))}
      <WhatsAppAccountPanel />
      <Card title="Comandos suportados pelo backend">
        <dl>
          <dt>nova entrega</dt>
          <dd>Inicia o registro de um pedido.</dd>
          <dt>pronto &lt;id&gt;</dt>
          <dd>Marca o pedido como pronto para coleta.</dd>
          <dt>cancelar &lt;id&gt;</dt>
          <dd>Solicita cancelamento conforme o estado da entrega.</dd>
          <dt>pedidos</dt>
          <dd>Consulta pedidos da empresa.</dd>
          <dt>saldo</dt>
          <dd>Consulta o saldo.</dd>
          <dt>suporte</dt>
          <dd>Solicita orientações de suporte.</dd>
        </dl>
        <p>
          O uso depende do canal configurado, número verificado e consentimento registrados no backend.
        </p>
      </Card>
    </>
  );
}
export function BusinessDocuments() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Documentos da empresa" description="Envie arquivos e acompanhe a análise." />
      {user?.businessId ? (
        <DocumentsPanel entityType="BUSINESS" entityId={user.businessId} />
      ) : (
        <p>Cadastre a empresa na configuração inicial antes de enviar documentos.</p>
      )}
    </>
  );
}
export function BusinessHelp() {
  return (
    <>
      <PageHeader title="Ajuda" />
      <Card title="Registrar uma entrega">
        <p>
          Cadastre a unidade, informe os dados do cliente e a localização de destino, adicione os itens e
          revise o pedido. Após o preparo, use “Marcar como pronto para coleta”.
        </p>
        <Link href="/app/entregas/nova">Nova entrega</Link>
      </Card>
      <Card title="Acompanhar e cancelar">
        <p>
          Abra o detalhe de uma entrega para acompanhar os horários e registrar incidentes. O backend
          confirma se o cancelamento é permitido e, quando necessário, mantém o processo de devolução da
          carga.
        </p>
        <Link href="/app/entregas">Ver entregas</Link>
      </Card>
      <Card title="Código de confirmação">
        <p>
          O cliente deve informar o código ao entregador somente após receber o pedido. A confirmação e
          os créditos financeiros são controlados pelo backend.
        </p>
      </Card>
      <UnavailableFeature
        title="Abrir chamado"
        description="Ainda não existe endpoint de atendimento ou contato de suporte configurado para esta interface. Incidentes vinculados a uma entrega podem ser registrados no detalhe do pedido."
      />
    </>
  );
}
