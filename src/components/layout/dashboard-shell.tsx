'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { homeForRole, canAccess } from '@/lib/access';
import { ConfirmDialog } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Logo } from '@/components/brand/logo';
import styles from './dashboard.module.css';
const business = [
  ['Meu painel', '/app'],
  ['Pedidos', '/app/pedidos'],
  ['Novo pedido', '/app/pedidos/novo'],
  ['Produtos', '/app/produtos'],
  ['Entregas', '/app/entregas'],
  ['Unidades', '/app/unidades'],
  ['Financeiro', '/app/financeiro'],
  ['Relatórios', '/app/analytics'],
  ['WhatsApp', '/app/whatsapp'],
  ['Perfil', '/app/perfil'],
  ['Documentos', '/app/empresa/documentos'],
  ['Configurar loja', '/app/onboarding'],
  ['Ajuda', '/app/ajuda'],
];
const driver = [
  ['Visão geral', '/app/entregador'],
  ['Disponibilidade', '/app/entregador/disponibilidade'],
  ['Ofertas', '/app/entregador/ofertas'],
  ['Rotas', '/app/entregador/rotas'],
  ['Ganhos', '/app/entregador/ganhos'],
  ['Veículo', '/app/entregador/veiculo'],
  ['Documentos', '/app/entregador/documentos'],
  ['Perfil', '/app/entregador/perfil'],
  ['Onboarding', '/app/entregador/onboarding'],
];
const admin = [
  ['Visão geral', '/admin'],
  ['Empresas', '/admin/empresas'],
  ['Entregadores', '/admin/entregadores'],
  ['Entregas', '/admin/entregas'],
  ['Rotas', '/admin/rotas'],
  ['Incidentes', '/admin/incidentes'],
  ['Financeiro', '/admin/financeiro'],
  ['Zonas', '/admin/zonas'],
  ['WhatsApp', '/admin/whatsapp'],
  ['Configuração', '/admin/configuracao'],
  ['Minha conta', '/admin/conta'],
];
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading, error, logout, refresh } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  useEffect(() => {
    if (isLoading || error) return;
    if (!user) router.replace('/login');
    else if (!canAccess(user.role, path)) router.replace(homeForRole(user.role));
  }, [isLoading, user, error, path, router]);
  if (error) return <ErrorState error={error} retry={() => void refresh().catch(() => undefined)} />;
  if (isLoading || !user) return <LoadingState message="Verificando sessão…" />;
  if (!canAccess(user.role, path)) return <LoadingState message="Redirecionando para seu painel…" />;
  const links = user.role === 'ADMIN' ? admin : user.role === 'DRIVER' ? driver : business;
  return (
    <div className={styles.root}>
      <a href="#main-content" className={styles.skip}>
        Ir para o conteúdo
      </a>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="orbita-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
        <div className={styles.context}>
          <strong>
            {user.role === 'ADMIN'
              ? 'Central de operação'
              : user.role === 'DRIVER'
                ? 'Portal do entregador'
                : 'Portal do estabelecimento'}
          </strong>
          ORBITA / {links.find(([, href]) => href === path)?.[0] ?? 'Operação'}
        </div>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {user.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div className={styles.accountText}>
            <strong>{user.name}</strong>
            {user.email}
          </div>
          <button type="button" className={styles.logout} onClick={() => setConfirm(true)}>
            Sair ↗
          </button>
        </div>
      </header>
      {menuOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <Link href={homeForRole(user.role)} className={styles.brand} aria-label="Início ORBITA">
          <Logo inverse />
        </Link>
        <p className={styles.caption}>Seu espaço de operação</p>
        <nav aria-label="Menu principal" id="orbita-navigation">
          <ul>
            {links.map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={path === href ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className={styles.navSymbol} aria-hidden="true">
                    {label === 'Novo pedido' ? '+' : '·'}
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sidebarFooter}>
          <strong>Mais entregas. Menos caminho.</strong>Entregas inteligentes, de ponta a ponta.
        </div>
      </aside>
      <main id="main-content" className={`${styles.main} dashboard-main`}>
        {children}
      </main>
      {!!logoutError && (
        <div className={styles.error}>
          <ErrorState error={logoutError} />
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Sair da ORBITA?"
        description="Sua sessão será encerrada neste navegador."
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await logout();
            router.replace('/login');
          } catch (cause) {
            setLogoutError(cause);
          } finally {
            setBusy(false);
            setConfirm(false);
          }
        }}
      />
    </div>
  );
}
