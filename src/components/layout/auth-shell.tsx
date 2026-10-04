import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import styles from './auth.module.css';
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.layout}>
      <aside className={styles.story}>
        <Link href="/" className={styles.brand}>
          <Logo inverse />
        </Link>
        <div>
          <span className={styles.eyebrow}>CONECTANDO CADA PONTA</span>
          <h2>
            Mais entregas.
            <br />
            <em>Menos caminho.</em>
          </h2>
          <p>
            Estabelecimentos e entregadores no mesmo ritmo. Sua operação, conectada do pedido ao destino.
          </p>
          <div className={styles.orbit} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        <small>ORBITA · Entregas inteligentes</small>
      </aside>
      <section className={styles.form}>
        <Link href="/" className={styles.mobileBrand}>
          <Logo />
        </Link>
        <Link href="/cadastro" className={styles.back}>
          ← Escolher outro perfil
        </Link>
        <header>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
        <footer>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Privacidade</Link>
        </footer>
      </section>
    </main>
  );
}
