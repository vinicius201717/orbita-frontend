import { api } from './client';
import type { Business, Branch, BusinessOverview, Billing } from '@/features/business/types';
import type { BusinessInput, BranchInput } from '@/features/business/schemas';
export const businessApi = {
  get: (id: string) => api.get<Business>(`/businesses/${id}`),
  create: (data: BusinessInput) => api.post<Business>('/businesses', data),
  update: (id: string, data: Partial<BusinessInput>) => api.patch<Business>(`/businesses/${id}`, data),
  branches: (id: string) => api.get<Branch[]>(`/businesses/${id}/branches`),
  createBranch: (id: string, data: BranchInput) => api.post<Branch>(`/businesses/${id}/branches`, data),
  updateBranch: (id: string, branchId: string, data: Partial<BranchInput> & { active?: boolean }) => api.patch<Branch>(`/businesses/${id}/branches/${branchId}`, data),
  overview: () => api.get<BusinessOverview>('/analytics/business/overview'),
  billing: (cursor?: string) => api.get<Billing>('/business/billing', { cursor }),
};
