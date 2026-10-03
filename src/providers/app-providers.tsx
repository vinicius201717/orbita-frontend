'use client';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth-provider';
import { NotificationProvider } from './notification-provider';
import { RealtimeProvider } from './realtime-provider';
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <NotificationProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
