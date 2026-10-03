export type OnboardingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminDriver {
  id: string;
  userId: string;
  phone: string;
  status: string;
  onboardingStatus: OnboardingStatus;
  rating: number;
  reliabilityScore: number;
  maxCapacityUnits: number;
  currentCapacityUnits: number;
  acceptNewOrders: boolean;
  currentRouteId: string | null;
  lastLocationAt: string | null;
  locationConsentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBranch {
  id: string;
  businessId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  active: boolean;
  createdAt: string;
}

export interface AdminBusiness {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  active: boolean;
  category: string;
  billingMode: string;
  businessReadyScore: number;
  createdAt: string;
  updatedAt: string;
  branches?: AdminBranch[];
}

export interface AdminDelivery {
  id: string;
  businessId: string;
  branchId: string;
  driverId: string | null;
  routeId: string | null;
  customerName: string;
  customerPhone?: string | null;
  status: string;
  readinessStatus: string;
  serviceLevel: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  complement: string | null;
  items: { name: string; quantity: number }[];
  capacityUnits: number;
  weightGrams: number | null;
  volumeCm3: number | null;
  revenueCents: number;
  driverPayoutCents: number;
  tipCents: number;
  pickupDeadline: string;
  deliveryDeadline: string;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  cancellationReason: string | null;
  proof?: { method: string; verifiedAt: string; recipientName: string | null } | null;
  incidents?: AdminIncident[];
}

export interface DeliveryPage {
  items: AdminDelivery[];
  nextCursor: string | null;
}

export interface AdminRoute {
  id: string;
  driverId: string;
  status: string;
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  grossValueCents: number;
  driverPayoutCents: number;
  platformMarginCents: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deliveries?: AdminDelivery[];
  stops?: {
    id: string;
    deliveryId: string;
    sequence: number;
    type: string;
    status: string;
    latitude: number;
    longitude: number;
    estimatedArrivalAt: string | null;
    arrivedAt: string | null;
    completedAt: string | null;
  }[];
}

export interface AdminIncident {
  id: string;
  deliveryId: string;
  type: string;
  notes: string | null;
  attachments: string[];
  createdBy: string;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  ledgerTransactionId: string;
  type: string;
  amountCents: number;
  createdAt: string;
}

export interface LedgerTransaction {
  id: string;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: string;
  entries: LedgerEntry[];
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
}

export interface FraudFlag {
  id: string;
  driverId: string | null;
  deliveryId: string | null;
  type: string;
  metadata: unknown;
  createdAt: string;
}

export interface PrivacyRequest {
  id: string;
  userId: string;
  type: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  active: boolean;
  boundary: unknown;
}

export interface PlatformOverview {
  logisticsGmvCents: number;
  grossRevenueCents: number;
  driverPayoutsCents: number;
  grossMarginCents: number;
  completed: number;
  onTimeRate: number;
  activeDrivers: number;
  activeBusinesses: number;
  offerAcceptanceRate: number;
  deliveriesPerDay: { day: string; deliveries: number }[];
}

export interface MatchingConfiguration {
  radiusMeters: number;
  candidateLimit: number;
  maxDeliveries: number;
  dynamicInsertion: boolean;
  multiPickup: boolean;
}

export interface PricingRules {
  baseRevenueCents: number;
  basePayoutCents: number;
  minimumCentsPerKm: number;
  minimumCentsPerHour: number;
  realPaymentsEnabled: false;
}

export interface WhatsAppIdentity {
  id: string;
  phoneNumber: string;
  entityType: 'BUSINESS' | 'DRIVER';
  entityId: string;
  verifiedAt: string | null;
  optInAt: string | null;
  lastInboundAt: string | null;
}

export type AdminResource =
  | 'businesses'
  | 'drivers'
  | 'routes'
  | 'incidents'
  | 'financial-transactions'
  | 'audit'
  | 'fraud-flags'
  | 'privacy-requests';

export type DeliveryFilters = Record<string, string | number | boolean | undefined>;
