'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
type Notice = { id: string; message: string; type: 'success' | 'error' | 'info' };
const Context = createContext<{ notify: (message: string, type?: Notice['type']) => void } | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const notify = useCallback(
    (message: string, type: Notice['type'] = 'success') =>
      setNotices((previous) => [...previous.slice(-4), { id: crypto.randomUUID(), message, type }]),
    [],
  );
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <Context.Provider value={value}>
      <div className="notifications" aria-live="polite">
        {notices.map((n) => (
          <p key={n.id} data-type={n.type}>
            {n.message}{' '}
            <Button
              aria-label="Fechar notificação"
              onClick={() => setNotices((items) => items.filter((item) => item.id !== n.id))}
            >
              Fechar
            </Button>
          </p>
        ))}
      </div>
      {children}
    </Context.Provider>
  );
}
export function useNotify() {
  const value = useContext(Context);
  if (!value) throw new Error('NotificationProvider missing');
  return value;
}
