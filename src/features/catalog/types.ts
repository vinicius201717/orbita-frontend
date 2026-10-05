export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: string;
  priceCents: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  category: string;
  priceCents: number;
  available: boolean;
}
