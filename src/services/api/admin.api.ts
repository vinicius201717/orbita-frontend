import { api } from '@/services/api/client';
import type {
  AdminBusiness,
  AdminBranch,
  AdminDelivery,
  AdminDriver,
  AdminDriverDetail,
  AdminWallet,
  AdminIncident,
  AdminResource,
  AdminRoute,
  DeliveryFilters,
  DeliveryPage,
  LedgerTransaction,
  MatchingConfiguration,
  OnboardingStatus,
  PlatformOverview,
  PricingRules,
  ServiceZone,
  WhatsAppIdentity,
} from '@/features/admin/types';

export const adminApi = {
  overview: () => api.get<PlatformOverview>('/analytics/platform/overview'),
  list: <T>(resource: AdminResource, cursor?: string) => api.get<T[]>(`/admin/${resource}`, { cursor }),
  business: (id: string) => api.get<AdminBusiness>(`/businesses/${id}`),
  branches: (id: string) => api.get<AdminBranch[]>(`/businesses/${id}/branches`),
  delivery: (id: string) => api.get<AdminDelivery>(`/deliveries/${id}`),
  deliveries: (filters: DeliveryFilters) => api.get<DeliveryPage>('/deliveries', filters),
  route: (id: string) => api.get<AdminRoute>(`/routes/${id}`),
  driver: (id: string) => api.get<AdminDriverDetail>(`/admin/drivers/${id}`),
  wallets: (cursor?: string) => api.get<{ items: AdminWallet[]; nextCursor: string | null }>('/admin/wallets', { cursor }),
  wallet: (id: string, cursor?: string) => api.get<AdminWallet & { entries: LedgerTransaction['entries']; nextCursor: string | null }>(`/admin/wallets/${id}`, { cursor }),
  resolveIncident: (deliveryId: string, id: string, resolution: string) => api.patch<AdminIncident>(`/deliveries/${deliveryId}/incidents/${id}/resolve`, { resolution }),
  incidents: (deliveryId: string) => api.get<AdminIncident[]>(`/deliveries/${deliveryId}/incidents`),
  reviewDriver: (id: string, status: OnboardingStatus) =>
    api.post<AdminDriver>(`/admin/drivers/${id}/review`, { status }),
  deliveryAction: (id: string, action: 'confirm' | 'reassign', reason: string) =>
    api.post<unknown>(`/admin/deliveries/${id}/${action}`, { reason }),
  completeReturn: (id: string) => api.post<unknown>(`/deliveries/${id}/return/complete`),
  adjust: (input: { walletId: string; amountCents: number; reason: string; idempotencyKey: string }) =>
    api.post<Omit<LedgerTransaction, 'entries'>>('/admin/finance/adjustments', input),
  zones: () => api.get<ServiceZone[]>('/admin/service-zones'),
  createZone: (input: { name: string; city: string; boundary: unknown }) =>
    api.post<Omit<ServiceZone, 'boundary'>>('/admin/service-zones', input),
  identity: (input: {
    phoneNumber: string;
    entityType: 'BUSINESS' | 'DRIVER';
    entityId: string;
    evidence: string;
  }) => api.post<WhatsAppIdentity>('/admin/whatsapp-identities', input),
  matchingConfig: () => api.get<MatchingConfiguration>('/admin/matching-config'),
  pricingRules: () => api.get<PricingRules>('/admin/pricing-rules'),
  runMatching: () => api.post<unknown>('/admin/matching/run'),
};

/** No driver detail endpoint exists. A cursor from the source list avoids a full scan. */
export async function findAdminDriver(id: string, cursorHint?: string): Promise<AdminDriver | null> {
  if (cursorHint) {
    const page = await adminApi.list<AdminDriver>('drivers', cursorHint);
    const driver = page.find((item) => item.id === id);
    if (driver) return driver;
  }
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await adminApi.list<AdminDriver>('drivers', cursor);
    const driver = page.find((item) => item.id === id);
    if (driver) return driver;
    const lastId = page.at(-1)?.id;
    if (page.length < 50 || !lastId || lastId === cursor) return null;
    cursor = lastId;
  }
  return null;
}
