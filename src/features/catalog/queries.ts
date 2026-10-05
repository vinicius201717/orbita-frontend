'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { catalogApi } from '@/services/api/catalog.api';

export function useProducts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['catalog', user?.businessId],
    queryFn: catalogApi.list,
    enabled: !!user?.businessId,
  });
}
