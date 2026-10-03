'use client';
import { useEffect, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-provider';
import { requestJson } from '@/services/api/client';
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000/operations', {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
    });
    const invalidate = () => {
      if (!active) return;
      void client.invalidateQueries();
    };
    const connect = async () => {
      try {
        const data = await requestJson<{ accessToken: string; expiresAt: number }>(
          '/api/session/socket',
        );
        if (!active) return;
        socket.auth = { token: data.accessToken };
        socket.connect();
        timer = setTimeout(
          () => {
            socket.disconnect();
            void connect();
          },
          Math.max(1000, data.expiresAt - Date.now() - 30000),
        );
      } catch {
        if (active) timer = setTimeout(() => void connect(), 30000);
      }
    };
    socket.on('connect', invalidate);
    for (const event of [
      'route.updated',
      'delivery.updated',
      'delivery.delivered',
      'offer.created',
      'offer.accepted',
      'RouteOfferClosed',
      'DriverStatusUpdated',
    ])
      socket.on(event, invalidate);
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && active) {
        clearTimeout(timer);
        void connect();
      }
    });
    void connect();
    return () => {
      active = false;
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, client]);
  return children;
}
