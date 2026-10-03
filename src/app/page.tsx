import Link from 'next/link';
export default function Home() {
  return (
    <main>
      <h1>ORBITA</h1>
      <p>Plataforma de operação logística para estabelecimentos e entregadores.</p>
      <nav aria-label="Acesso">
        <Link href="/login">Entrar</Link>
        {' · '}
        <Link href="/cadastro">Criar conta</Link>
      </nav>
    </main>
  );
}
