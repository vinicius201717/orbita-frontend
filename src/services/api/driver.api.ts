import { api } from '@/services/api/client';
import type {
  DriverAnalytics,
  DriverDelivery,
  DriverEarning,
  DriverIncident,
  DriverOffer,
  DriverProfile,
  DriverRoute,
  DriverStatus,
  DriverWallet,
  DeliveryPage,
  Vehicle,
} from '@/features/driver/types';
import type { VehicleInput } from '@/features/driver/schemas';

const idPath = (id: string) => encodeURIComponent(id);
export const driverApi = {
  me: () => api.get<DriverProfile>('/driver/me'),
  status: (status: DriverStatus) =>
    api.patch<Omit<DriverProfile, 'vehicles' | 'currentLocation' | 'presence'>>('/driver/me/status', {
      status,
    }),
  consent: (granted: boolean) => api.post<{ granted: boolean }>('/driver/consent', { granted }),
  vehicle: (body: VehicleInput) => api.post<Vehicle>('/driver/vehicles', body),
  location: (body: { latitude: number; longitude: number; accuracy?: number; timestamp: string }) =>
    api.post<{ accepted: boolean }>('/driver/location', body),
  offers: () => api.get<DriverOffer[]>('/driver/offers'),
  accept: (id: string) =>
    api.post<{ id: string; routeId: string | null; status: 'ACCEPTED' }>(
      `/driver/offers/${idPath(id)}/accept`,
    ),
  reject: (id: string) =>
    api.post<{ id: string; changed: boolean }>(`/driver/offers/${idPath(id)}/reject`),
  route: (id: string) => api.get<DriverRoute>(`/routes/${idPath(id)}`),
  routes: (cursor?: string) => api.get<{ items: DriverRoute[]; nextCursor: string | null }>('/routes', { cursor }),
  start: (id: string) => api.post<{ id: string; status: string }>(`/routes/${idPath(id)}/start`),
  arrive: (routeId: string, stopId: string) =>
    api.post<unknown>(`/routes/${idPath(routeId)}/stops/${idPath(stopId)}/arrive`),
  completePickup: (routeId: string, stopId: string) =>
    api.post<unknown>(`/routes/${idPath(routeId)}/stops/${idPath(stopId)}/complete`),
  finish: (id: string) => api.post<{ id: string; status: string }>(`/routes/${idPath(id)}/finish`),
  deliveries: (cursor?: string) => api.get<DeliveryPage>('/deliveries', { cursor, limit: 25 }),
  delivery: (id: string) => api.get<DriverDelivery>(`/deliveries/${idPath(id)}`),
  verify: (id: string, code: string) =>
    api.post<DriverDelivery>(`/deliveries/${idPath(id)}/verify`, { code }),
  wallet: (cursor?: string) => api.get<DriverWallet>('/driver/wallet', { cursor }),
  earnings: (cursor?: string) => api.get<DriverEarning[]>('/driver/earnings', { cursor }),
  analytics: () => api.get<DriverAnalytics>('/analytics/driver/overview'),
  incidents: (id: string) => api.get<DriverIncident[]>(`/deliveries/${idPath(id)}/incidents`),
  incident: (id: string, body: { type: string; notes?: string }) =>
    api.post<DriverIncident>(`/deliveries/${idPath(id)}/incidents`, body),
  cancel: (id: string, reason: string) =>
    api.post<unknown>(`/deliveries/${idPath(id)}/cancel`, { reason }),
  returning: (id: string) => api.post<unknown>(`/deliveries/${idPath(id)}/return`),
};
