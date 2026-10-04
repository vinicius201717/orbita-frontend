import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';
import { AuthShell } from '@/components/layout/auth-shell';
export default function LoginPage() {
  return (
    <AuthShell title="Entrar na ORBITA" description="Acesse sua conta e acompanhe sua operação.">
      <LoginForm />
      <Link href="/">Voltar ao início</Link>
    </AuthShell>
  );
}
