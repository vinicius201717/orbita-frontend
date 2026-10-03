'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from './schemas';
import { useAuth } from '@/providers/auth-provider';
import { homeForRole } from '@/lib/access';
import { Button, FormField, Input } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const user = await login(values.email, values.password);
          router.push(homeForRole(user.role));
          router.refresh();
        } catch (cause) {
          setError(cause);
        }
      })}
      noValidate
      className="form"
    >
      <FormField id="login-email" label="E-mail" error={errors.email?.message}>
        <Input type="email" autoComplete="username" {...register('email')} />
      </FormField>
      <FormField id="login-password" label="Senha" error={errors.password?.message}>
        <Input
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          {...register('password')}
        />
      </FormField>
      <Button onClick={() => setShow((value) => !value)} aria-pressed={show}>
        {show ? 'Ocultar senha' : 'Mostrar senha'}
      </Button>
      {!!error && <ErrorState error={error} />}
      <Button type="submit" loading={isSubmitting}>
        Entrar
      </Button>
      <p>
        <Link href="/cadastro">Criar uma conta</Link>
      </p>
      <p>Recuperação de senha indisponível nesta versão.</p>
    </form>
  );
}
