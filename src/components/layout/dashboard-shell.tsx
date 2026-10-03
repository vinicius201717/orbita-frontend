'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { homeForRole, canAccess } from '@/lib/access';
import { Button, ConfirmDialog } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
const business = [
  ['Visão geral', '/app'],
  ['Entregas', '/app/entregas'],
  ['Nova entrega', '/app/entregas/nova'],
  ['Unidades', '/app/unidades'],
  ['Financeiro', '/app/financeiro'],
  ['Analytics', '/app/analytics'],
  ['WhatsApp', '/app/whatsapp'],
  ['Perfil', '/app/perfil'],
  ['Documentos', '/app/empresa/documentos'],
  ['Onboarding', '/app/onboarding'],
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
];
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading, error, logout, refresh } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
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
    <div className="dashboard">
      <a href="#main-content">Ir para o conteúdo</a>
      <header>
        <Link href={homeForRole(user.role)}>ORBITA</Link>
        <p>
          {user.name} — {user.email}
        </p>
        <Button onClick={() => setConfirm(true)}>Sair</Button>
      </header>
      <aside className="dashboard-sidebar">
        <nav aria-label="Menu principal">
          <ul>
            {links.map(([label, href]) => (
              <li key={href}>
                <Link href={href} aria-current={path === href ? 'page' : undefined}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main id="main-content" className="dashboard-main">
        {children}
      </main>
      {!!logoutError && <ErrorState error={logoutError} />}
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
