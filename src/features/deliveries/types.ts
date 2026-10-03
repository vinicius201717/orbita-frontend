export const deliveryStatuses = [
  'CREATED',
  'WAITING_POOL',
  'MATCHING',
  'OFFERED',
  'ASSIGNED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVING',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'RETURN_REQUIRED',
  'RETURNING',
  'RETURNED',
] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];
export type ServiceLevel = 'ECONOMY' | 'SMART' | 'EXPRESS';
export const cargoCategories = [
  'HOT',
  'COLD',
  'FROZEN',
  'AMBIENT',
  'FRAGILE',
  'BEVERAGE',
  'MEDICINE',
  'OTHER',
] as const;
export const incidentTypes = [
  'CUSTOMER_UNAVAILABLE',
  'WRONG_ADDRESS',
  'BUSINESS_DELAY',
  'PRODUCT_DAMAGED',
  'DRIVER_BREAKDOWN',
  'ACCIDENT',
  'CUSTOMER_REFUSED',
  'OTHER',
] as const;
export const incidentLabels: Record<(typeof incidentTypes)[number], string> = {
  CUSTOMER_UNAVAILABLE: 'Cliente indisponível',
  WRONG_ADDRESS: 'Endereço incorreto',
  BUSINESS_DELAY: 'Atraso na preparação',
  PRODUCT_DAMAGED: 'Produto danificado',
  DRIVER_BREAKDOWN: 'Problema com o veículo',
  ACCIDENT: 'Acidente',
  CUSTOMER_REFUSED: 'Recusa do cliente',
  OTHER: 'Outro',
};
export type Delivery = {
  id: string;
  businessId: string;
  branchId: string;
  driverId: string | null;
  routeId: string | null;
  externalReference: string | null;
  customerName: string;
  customerPhone: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  complement: string | null;
  items: { name: string; quantity: number }[];
  status: DeliveryStatus;
  readinessStatus: 'PREPARING' | 'READY_FOR_PICKUP';
  serviceLevel: ServiceLevel;
  category: (typeof cargoCategories)[number];
  capacityUnits: number;
  weightGrams: number | null;
  volumeCm3: number | null;
  temperatureRequirement: string | null;
  packageType: string | null;
  readyAt: string | null;
  estimatedReadyAt: string | null;
  pickupDeadline: string;
  deliveryDeadline: string;
  maxDeliveryDurationSeconds: number;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  revenueCents: number;
  tipCents: number;
  verifiedAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};
export type DeliveryPage = { items: Delivery[]; nextCursor: string | null };
export type DeliveryFilters = {
  status?: string;
  branchId?: string;
  driverId?: string;
  routeId?: string;
  serviceLevel?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};
export type Incident = {
  id: string;
  deliveryId: string;
  type: (typeof incidentTypes)[number];
  notes: string | null;
  attachments: string[];
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
};
export type BusinessRoute = {
  id: string;
  driverId: string;
  status: string;
  version: number;
  startedAt: string | null;
  completedAt: string | null;
  deliveries: Delivery[];
  stops: {
    id: string;
    deliveryId: string;
    type: 'PICKUP' | 'DROPOFF';
    status: string;
    estimatedArrivalAt: string | null;
    arrivedAt: string | null;
    completedAt: string | null;
  }[];
};
