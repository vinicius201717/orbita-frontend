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
      <Card title="Cadastrar produtos e lanches">
        <p>
          Em Produtos, informe nome, preço e categoria. Quando um item acabar, pause sua disponibilidade.
          Os pedidos antigos mantêm o nome e o preço que tinham quando foram criados.
        </p>
        <Link href="/app/produtos">Abrir meu catálogo</Link>
      </Card>
      <Card title="Montar um pedido">
        <p>
          Clique em Novo pedido, escolha os produtos e as quantidades, informe o cliente e confirme o
          endereço. Revise tudo e confirme. Quando terminar o preparo, use “Marcar como pronto”. A
          entrega fica vinculada ao pedido.
        </p>
        <Link href="/app/pedidos/novo">Novo pedido</Link>
      </Card>
      <Card title="Confirmar o endereço">
        <p>
          Informe rua, número, bairro e cidade e busque o endereço. Confira o ponto antes de selecionar.
          Se a busca não estiver ativada, abra o Google Maps e copie as coordenadas do ponto exato na
          opção “Usar um ponto do Google Maps”. Não use a localização da loja como destino do cliente.
        </p>
      </Card>
      <Card title="Acompanhar e cancelar">
        <p>
          Use os filtros em Pedidos para ver o que está em preparo, pronto ou a caminho. No detalhe do
          pedido você pode cancelar antes da coleta. Depois que o entregador retirar o pedido, a
          solicitação inicia uma devolução.
        </p>
        <Link href="/app/pedidos">Ver pedidos</Link>
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
