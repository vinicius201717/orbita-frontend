'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { api, requestJson } from '@/services/api/client';
import { Button, Card, FormField, Input } from '@/components/ui';
import { ErrorState, SuccessMessage } from '@/components/feedback';
const profileSchema = z.object({
  name: z.string().min(2, 'Informe seu nome.').max(120),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional.'),
});
const passwordSchema = z
  .object({
    currentPassword: z.string().min(10),
    newPassword: z.string().min(10, 'Use pelo menos 10 caracteres.').max(128),
    confirm: z.string(),
  })
  .refine((value) => value.newPassword === value.confirm, {
    path: ['confirm'],
    message: 'As senhas precisam ser iguais.',
  });
export function AccountSettings() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });
  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  return (
    <>
      <Card title="Dados da conta">
        <form
          noValidate
          onSubmit={profile.handleSubmit(async (values) => {
            setError(null);
            setSaved(false);
            try {
              await api.patch('/auth/me', values);
              await refresh();
              setSaved(true);
            } catch (cause) {
              setError(cause);
            }
          })}
        >
          <FormField
            id="account-name"
            label="Nome da conta"
            error={profile.formState.errors.name?.message}
          >
            <Input autoComplete="name" {...profile.register('name')} />
          </FormField>
          <FormField
            id="account-phone"
            label="Telefone da conta"
            error={profile.formState.errors.phone?.message}
          >
            <Input type="tel" autoComplete="tel" {...profile.register('phone')} />
          </FormField>
          <p>E-mail de acesso: {user?.email}</p>
          <Button type="submit" loading={profile.formState.isSubmitting}>
            Salvar conta
          </Button>
        </form>
        {saved && <SuccessMessage>Dados da conta atualizados.</SuccessMessage>}
      </Card>
      <Card title="Segurança">
        <p>A troca de senha encerra todas as suas sessões. Entre novamente com a nova senha.</p>
        <form
          noValidate
          onSubmit={password.handleSubmit(async ({ currentPassword, newPassword }) => {
            setError(null);
            try {
              await requestJson('/api/session/password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword }),
              });
              password.reset();
              await logout();
              router.replace('/login');
            } catch (cause) {
              setError(cause);
            }
          })}
        >
          <FormField
            id="current-password"
            label="Senha atual"
            error={password.formState.errors.currentPassword?.message}
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...password.register('currentPassword')}
            />
          </FormField>
          <FormField
            id="new-password"
            label="Nova senha"
            error={password.formState.errors.newPassword?.message}
          >
            <Input type="password" autoComplete="new-password" {...password.register('newPassword')} />
          </FormField>
          <FormField
            id="confirm-password"
            label="Confirme a nova senha"
            error={password.formState.errors.confirm?.message}
          >
            <Input type="password" autoComplete="new-password" {...password.register('confirm')} />
          </FormField>
          <Button type="submit" loading={password.formState.isSubmitting}>
            Alterar senha
          </Button>
        </form>
      </Card>
      {!!error && <ErrorState error={error} />}
    </>
  );
}
