/** Response projections verified against backend services and prisma/schema.prisma. */
export type DriverStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_ROUTE' | 'PAUSED';
export type OnboardingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VehicleType = 'MOTORCYCLE' | 'CAR' | 'UTILITY' | 'VAN';
export type CargoCategory =
  'HOT' | 'COLD' | 'FROZEN' | 'AMBIENT' | 'FRAGILE' | 'BEVERAGE' | 'MEDICINE' | 'OTHER';
export interface Vehicle {
  id: string;
  driverId: string;
  type: VehicleType;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  capacityUnits: number;
  weightCapacityGrams: number | null;
  volumeCapacityCm3: number | null;
  compatibleCategories: CargoCategory[];
  active: boolean;
}
export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  expiresAt: string;
}
export interface DriverProfile {
  id: string;
  userId: string;
  phone: string;
  status: DriverStatus;
  onboardingStatus: OnboardingStatus;
  rating: number;
  reliabilityScore: number;
  maxCapacityUnits: number;
  currentCapacityUnits: number;
  acceptNewOrders: boolean;
  currentRouteId: string | null;
  lastLocationAt: string | null;
  locationConsentAt: string | null;
  vehicles: Vehicle[];
  currentLocation: DriverLocation | null;
  presence: 'FRESH' | 'STALE';
  createdAt: string;
  updatedAt: string;
}
export interface DriverOffer {
  id: string;
  offerType: 'INSERTION' | 'NEW_ROUTE';
  deliveryCount: number;
  additionalDistanceMeters: number;
  additionalDurationSeconds: number;
  offeredPayoutCents: number;
  expiresAt: string;
  approximatePickup: { latitude: number; longitude: number } | null;
}
export interface DriverDelivery {
  id: string;
  routeId: string | null;
  businessId: string;
  branchId: string;
  driverId: string | null;
  customerName: string;
  customerPhone: string | null;
  complement: string | null;
  items: { name: string; quantity: number }[];
  status: string;
  readinessStatus: 'PREPARING' | 'READY_FOR_PICKUP';
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  capacityUnits: number;
  weightGrams: number | null;
  volumeCm3: number | null;
  category: CargoCategory;
  serviceLevel: 'ECONOMY' | 'SMART' | 'EXPRESS';
  estimatedReadyAt: string | null;
  pickupDeadline: string;
  deliveryDeadline: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  verifiedAt: string | null;
  cancellationReason: string | null;
  driverPayoutCents: number;
  tipCents: number;
  createdAt: string;
}
export interface DriverRouteStop {
  id: string;
  routeId: string;
  deliveryId: string;
  type: 'PICKUP' | 'DROPOFF';
  sequence: number;
  latitude: number;
  longitude: number;
  estimatedArrivalAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  status: 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
}
export interface DriverRoute {
  id: string;
  driverId: string;
  status: 'BUILDING' | 'OFFERING' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
  driverPayoutCents: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  version: number;
  stops: DriverRouteStop[];
  deliveries: DriverDelivery[];
}
export interface DriverAnalytics {
  earningsCents: number;
  deliveries: number;
  routes: number;
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedCentsPerKm: number;
  estimatedCentsPerHour: number;
}
export interface WalletEntry {
  id: string;
  walletId: string;
  ledgerTransactionId: string;
  type: string;
  amountCents: number;
  createdAt: string;
}
export interface DriverWallet {
  walletId?: string;
  balanceCents: number;
  entries: WalletEntry[];
  nextCursor: string | null;
}
export interface DriverEarning {
  id: string;
  deliveryId: string;
  driverId: string;
  payoutCents: number;
  tipCents: number;
  createdAt: string;
}
export interface DriverIncident {
  id: string;
  deliveryId: string;
  type: string;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
export interface DeliveryPage {
  items: DriverDelivery[];
  nextCursor: string | null;
}
