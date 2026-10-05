import { api } from './client';
import type {
  CreateOrderInput,
  MerchantOrder,
  OrdersPageResult,
  OrdersSummary,
} from '@/features/orders/types';

export const ordersApi = {
  summary: () => api.get<OrdersSummary>('/business/orders/summary'),
  list: (filters: { cursor?: string; limit?: number; stage?: string; search?: string } = {}) =>
    api.get<OrdersPageResult>('/business/orders', filters),
  get: (id: string) => api.get<MerchantOrder>(`/business/orders/${id}`),
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    api.post<MerchantOrder>('/business/orders', input, { 'Idempotency-Key': idempotencyKey }),
};
