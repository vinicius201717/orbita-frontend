import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
export function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  return (
    <p role="status" aria-live="polite">
      {message}
    </p>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-state">
      <p>{error instanceof Error ? error.message : 'Não foi possível carregar os dados.'}</p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </section>
  );
}
export function UnavailableFeature({ title, description }: { title: string; description: string }) {
  return (
    <section className="unavailable-feature" aria-label={title}>
      <h2>{title}</h2>
      <p>Indisponível nesta integração.</p>
      <p>{description}</p>
    </section>
  );
}
export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="success-message">
      {children}
    </p>
  );
}
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="form-error">
      {children}
    </p>
  );
}
