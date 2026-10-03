'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { driverApi } from '@/services/api/driver.api';

export const driverKeys = {
  all: ['driver'] as const,
  me: ['driver', 'me'] as const,
  offers: ['driver', 'offers'] as const,
  routeHistory: ['driver', 'route-history'] as const,
  analytics: ['driver', 'analytics'] as const,
  wallet: (cursor?: string) => ['driver', 'wallet', cursor ?? ''] as const,
  earnings: (cursor?: string) => ['driver', 'earnings', cursor ?? ''] as const,
  route: (id: string) => ['routes', id] as const,
  delivery: (id: string) => ['deliveries', 'driver', id] as const,
  incidents: (id: string) => ['deliveries', 'incidents', id] as const,
};
export function useDriver() {
  return useQuery({ queryKey: driverKeys.me, queryFn: driverApi.me });
}
export function useDriverInvalidation() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: driverKeys.all }),
      client.invalidateQueries({ queryKey: ['routes'] }),
      client.invalidateQueries({ queryKey: ['deliveries'] }),
    ]);
  };
}
