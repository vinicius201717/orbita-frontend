import { api } from './client';
import type {
  Delivery,
  DeliveryPage,
  DeliveryFilters,
  Incident,
  BusinessRoute,
} from '@/features/deliveries/types';
import { deliveryPayload, type DeliveryInput, type IncidentInput } from '@/features/deliveries/schemas';
export const deliveryApi = {
  list: (filters: DeliveryFilters = {}) => api.get<DeliveryPage>('/deliveries', filters),
  get: (id: string) => api.get<Delivery>(`/deliveries/${id}`),
  create: (body: DeliveryInput, key: string) =>
    api.post<Delivery>(
      '/deliveries',
      deliveryPayload(body),
      body.externalReference ? undefined : { 'Idempotency-Key': key },
    ),
  ready: (id: string) => api.post<Delivery>(`/deliveries/${id}/ready`),
  customerCode: (id: string) => api.post<{ deliveryId: string; code: string; instructions: string }>(`/deliveries/${encodeURIComponent(id)}/customer-code`),
  cancel: (id: string, reason: string) =>
    api.post<Pick<Delivery, 'id' | 'status'>>(`/deliveries/${id}/cancel`, { reason }),
  incidents: (id: string) => api.get<Incident[]>(`/deliveries/${id}/incidents`),
  incident: (id: string, body: IncidentInput) => api.post<Incident>(`/deliveries/${id}/incidents`, body),
  route: (id: string) => api.get<BusinessRoute>(`/routes/${id}`),
};
