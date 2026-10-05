'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { ordersApi } from '@/services/api/orders.api';

export function useOrders(filters: { stage?: string; search?: string } = {}) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['merchant-orders', 'list', user?.businessId, filters],
    queryFn: ({ pageParam }) => ordersApi.list({ ...filters, cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!user?.businessId,
    refetchInterval: 30_000,
  });
}

export function useOrdersSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['merchant-orders', 'summary', user?.businessId],
    queryFn: ordersApi.summary,
    enabled: !!user?.businessId,
    refetchInterval: 30_000,
  });
}
