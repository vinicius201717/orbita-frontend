'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { businessApi } from '@/services/api/business.api';
export function useBusiness() {
  const { user } = useAuth();
  const id = user?.businessId;
  return useQuery({ queryKey: ['business', id], queryFn: () => businessApi.get(id!), enabled: !!id });
}
export function useBranches() {
  const { user } = useAuth();
  const id = user?.businessId;
  return useQuery({
    queryKey: ['business', 'branches', id],
    queryFn: () => businessApi.branches(id!),
    enabled: !!id,
  });
}
export function useBusinessOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business', 'overview', user?.businessId],
    queryFn: businessApi.overview,
    enabled: !!user?.businessId,
  });
}
