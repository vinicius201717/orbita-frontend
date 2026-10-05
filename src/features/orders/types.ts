import type { Delivery, ServiceLevel, cargoCategories } from '@/features/deliveries/types';

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type MerchantOrder = {
  id: string;
  businessId: string;
  branchId: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  notes: string | null;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
  delivery: Delivery;
};

export type OrdersPageResult = { items: MerchantOrder[]; nextCursor: string | null };
export type OrdersSummary = {
  preparing: number;
  ready: number;
  onTheWay: number;
  completedToday: number;
  cancelledToday: number;
  productCount: number;
  availableProductCount: number;
  salesTodayCents: number;
};

export type CreateOrderInput = {
  branchId: string;
  customer: { name: string; phone?: string; optIn?: boolean };
  dropoff: { latitude: number; longitude: number; complement?: string };
  address: string;
  notes?: string;
  items: { productId: string; quantity: number }[];
  serviceLevel?: ServiceLevel;
  category?: (typeof cargoCategories)[number];
  preparationMinutes?: number;
};
