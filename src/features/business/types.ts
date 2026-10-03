export type BusinessCategory = 'FOOD' | 'PHARMACY' | 'BEVERAGE_DISTRIBUTOR';
export type Business = {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  category: BusinessCategory;
  active: boolean;
  billingMode: 'PREPAID' | 'POSTPAID';
  createdAt: string;
};
export type Branch = {
  id: string;
  businessId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  active: boolean;
  createdAt: string;
};
export type BusinessOverview = {
  deliveries: number;
  completed: number;
  cancelled: number;
  averageDeliverySeconds: number;
  averageCostCents: number;
  onTimeRate: number;
};
export type BillingEntry = {
  id: string;
  walletId: string;
  ledgerTransactionId: string;
  type: string;
  amountCents: number;
  createdAt: string;
};
export type Billing = {
  walletId?: string;
  balanceCents: number;
  entries: BillingEntry[];
  nextCursor: string | null;
};
