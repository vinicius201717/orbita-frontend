'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  FormField,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { ErrorState, SuccessMessage, UnavailableFeature } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { adminApi } from '@/services/api/admin.api';
import { identitySchema } from './schemas';
import { RecordFields } from './shared';

type IdentityForm = z.infer<typeof identitySchema>;

export function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<IdentityForm | null>(null);
  const form = useForm<IdentityForm>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      entityType: 'BUSINESS',
      entityId: '',
      phoneNumber: '',
      evidence: '',
      confirmedEvidence: false,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: IdentityForm) =>
      adminApi.identity({
        entityType: values.entityType,
        entityId: values.entityId,
        phoneNumber: values.phoneNumber,
        evidence: values.evidence,
      }),
    onError: () => setPending(null),
    onSuccess: async () => {
      setPending(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
  return (
    <section className="admin-whatsapp">
      <PageHeader
        title="WhatsApp"
        description="Verificação administrativa de identidade e consentimento, com registro em auditoria."
      />
      <UnavailableFeature
        title="Conexão e identidades cadastradas"
        description="Não há endpoint de listagem de identidades ou status da conexão com o provedor. O cadastro de identidade abaixo não comprova que o envio de mensagens está ativo."
      />
      <Card title="Registrar identidade verificada">
        <p>
          O número precisa coincidir com o telefone cadastrado da empresa ou do entregador. Confirme a
          identidade e o opt-in por um processo verificável antes de registrar.
        </p>
        <form className="form" onSubmit={form.handleSubmit(setPending)}>
          <FormField
            id="identity-type"
            label="Tipo de cadastro"
            error={form.formState.errors.entityType?.message}
          >
            <Select id="identity-type" {...form.register('entityType')}>
              <option value="BUSINESS">Empresa</option>
              <option value="DRIVER">Entregador</option>
            </Select>
          </FormField>
          <FormField
            id="identity-id"
            label="ID da empresa ou entregador"
            error={form.formState.errors.entityId?.message}
          >
            <Input id="identity-id" {...form.register('entityId')} />
          </FormField>
          <FormField
            id="identity-phone"
            label="Telefone cadastrado"
            hint="Inclua +, código do país e DDD."
            error={form.formState.errors.phoneNumber?.message}
          >
            <Input id="identity-phone" type="tel" autoComplete="off" {...form.register('phoneNumber')} />
          </FormField>
          <FormField
            id="identity-evidence"
            label="Referência da evidência"
            hint="Referência do registro que comprova identidade e autorização. Não informe senhas ou códigos de autenticação."
            error={form.formState.errors.evidence?.message}
          >
            <Textarea id="identity-evidence" maxLength={200} {...form.register('evidence')} />
          </FormField>
          <FormField
            id="identity-confirmed"
            label="Verifiquei as evidências de identidade e consentimento para WhatsApp."
            error={form.formState.errors.confirmedEvidence?.message}
          >
            <Checkbox id="identity-confirmed" {...form.register('confirmedEvidence')} />
          </FormField>
          <Button type="submit" loading={mutation.isPending}>
            Revisar verificação
          </Button>
        </form>
        {mutation.isError && <ErrorState error={mutation.error} />}
        {mutation.isSuccess && (
          <>
            <SuccessMessage>
              Identidade registrada. Isso não confirma a disponibilidade do provedor de mensagens.
            </SuccessMessage>
            <RecordFields
              items={[
                { label: 'ID da identidade', value: mutation.data.id },
                { label: 'Telefone', value: mutation.data.phoneNumber },
                { label: 'Verificado em', value: formatDate(mutation.data.verifiedAt) },
                { label: 'Consentimento registrado em', value: formatDate(mutation.data.optInAt) },
              ]}
            />
          </>
        )}
        <ConfirmDialog
          open={pending !== null}
          title="Confirmar identidade e opt-in"
          description={
            pending
              ? `Registrar o telefone ${pending.phoneNumber} para ${pending.entityType === 'BUSINESS' ? 'a empresa' : 'o entregador'} ${pending.entityId}? Um vínculo anterior desse telefone será atualizado, e a evidência ficará na auditoria.`
              : ''
          }
          loading={mutation.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            if (pending) mutation.mutate(pending);
          }}
        />
      </Card>
    </section>
  );
}
