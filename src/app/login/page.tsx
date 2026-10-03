import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';
export default function LoginPage() {
  return (
    <main className="auth-page">
      <h1>Entrar na ORBITA</h1>
      <LoginForm />
      <Link href="/">Voltar ao início</Link>
    </main>
  );
}
