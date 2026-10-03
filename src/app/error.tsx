'use client';
import { ErrorState } from '@/components/feedback';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>Não foi possível abrir esta página</h1>
      <ErrorState
        error={new Error('Tente novamente. Se o problema continuar, retorne à página inicial.')}
        retry={reset}
      />
    </main>
  );
}
