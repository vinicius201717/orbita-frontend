'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@/types/auth';
import { requestJson } from '@/services/api/client';
type Auth = {
  user: SessionUser | null;
  role: SessionUser['role'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: unknown;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<SessionUser | null>;
};
const Context = createContext<Auth | null>(null);
function scope(user: SessionUser | null) {
  return user ? [user.id, user.role, user.businessId, user.driverId].join(':') : null;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const client = useQueryClient();
  const refreshing = useRef<Promise<SessionUser | null> | null>(null);
  const generation = useRef(0);
  const currentUser = useRef<SessionUser | null>(null);
  const changingSession = useRef(false);
  const publishUser = useCallback(
    (next: SessionUser | null) => {
      if (scope(currentUser.current) !== scope(next)) client.clear();
      currentUser.current = next;
      setUser(next);
    },
    [client],
  );
  const invalidateRefresh = useCallback(() => {
    generation.current++;
    refreshing.current = null;
    return generation.current;
  }, []);
  const refresh = useCallback(() => {
    if (changingSession.current) return Promise.resolve(currentUser.current);
    if (refreshing.current) return refreshing.current;
    const version = generation.current;
    const task = (async () => {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' });
        if (version !== generation.current) return currentUser.current;
        if (response.status === 401) {
          publishUser(null);
          client.clear();
          return null;
        }
        if (!response.ok) throw new Error('Não foi possível verificar sua sessão.');
        const data = (await response.json()) as { user: SessionUser };
        if (version !== generation.current) return currentUser.current;
        publishUser(data.user);
        setError(null);
        return data.user;
      } catch (cause) {
        if (version !== generation.current) return currentUser.current;
        setError(cause);
        throw cause;
      } finally {
        if (version === generation.current) {
          setLoading(false);
          refreshing.current = null;
        }
      }
    })();
    refreshing.current = task;
    return task;
  }, [client, publishUser]);
  useEffect(() => {
    void refresh().catch(() => undefined);
    const expired = () => {
      invalidateRefresh();
      changingSession.current = false;
      publishUser(null);
      client.clear();
      setLoading(false);
    };
    const focus = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener('orbita:session-expired', expired);
    window.addEventListener('focus', focus);
    return () => {
      window.removeEventListener('orbita:session-expired', expired);
      window.removeEventListener('focus', focus);
    };
  }, [refresh, client, invalidateRefresh, publishUser]);
  const login = useCallback(
    async (email: string, password: string) => {
      const version = invalidateRefresh();
      changingSession.current = true;
      try {
        const data = await requestJson<{ user: SessionUser }>('/api/session/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (version !== generation.current) throw new Error('A sessão mudou. Entre novamente.');
        client.clear();
        publishUser(data.user);
        setError(null);
        return data.user;
      } finally {
        if (version === generation.current) {
          changingSession.current = false;
          setLoading(false);
        }
      }
    },
    [client, invalidateRefresh, publishUser],
  );
  const logout = useCallback(async () => {
    const version = invalidateRefresh();
    changingSession.current = true;
    try {
      await requestJson('/api/session/logout', { method: 'POST' });
      if (version !== generation.current) return;
      publishUser(null);
      client.clear();
      window.dispatchEvent(new Event('orbita:logged-out'));
    } finally {
      if (version === generation.current) {
        changingSession.current = false;
        setLoading(false);
      }
    }
  }, [client, invalidateRefresh, publishUser]);
  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, isLoading, error, login, logout, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error('AuthProvider missing');
  return context;
}
