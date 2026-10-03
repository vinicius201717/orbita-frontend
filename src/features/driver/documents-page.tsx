'use client';
import { Button, FormField, Input, PageHeader, Select, Table } from '@/components/ui';
import { UnavailableFeature } from '@/components/feedback';

export function DriverDocumentsPage() {
  return (
    <section className="page documents-page">
      <PageHeader
        title="Documentos do entregador"
        description="O envio ficará disponível quando a API fornecer os documentos solicitados e as regras de arquivo."
      />
      <UnavailableFeature
        title="Envio e consulta indisponíveis"
        description="O backend possui o modelo DriverDocument, mas ainda não expõe endpoints de listagem, upload ou reenvio para o entregador. Nenhum arquivo será enviado por esta tela."
      />
      <form className="form document-form">
        <fieldset disabled>
          <legend>Envio de documento</legend>
          <FormField id="driver-document-type" label="Tipo do documento">
            <Select id="driver-document-type">
              <option>Aguardando configuração da API</option>
            </Select>
          </FormField>
          <FormField id="driver-document-file" label="Arquivo">
            <Input id="driver-document-file" type="file" />
          </FormField>
          <FormField id="driver-document-expiry" label="Validade (opcional)">
            <Input id="driver-document-expiry" type="date" />
          </FormField>
          <Button type="button" disabled>
            Enviar documento — indisponível
          </Button>
        </fieldset>
      </form>
      <Table caption="Documentos — consulta ainda indisponível">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Status</th>
            <th>Validade</th>
            <th>Data de envio</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>
              Não é possível consultar documentos nesta versão. Isso não significa que você não possua
              documentos cadastrados.
            </td>
          </tr>
        </tbody>
      </Table>
      <p>
        Nenhum documento é apresentado como obrigação legal sem uma configuração do serviço. Tamanho
        máximo, extensões e tipos de arquivo serão validados conforme o contrato de upload.
      </p>
    </section>
  );
}
