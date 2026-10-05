import { api } from './client';
import type { Product, ProductInput } from '@/features/catalog/types';

export const catalogApi = {
  list: () => api.get<Product[]>('/business/products'),
  create: (data: ProductInput) => api.post<Product>('/business/products', data),
  update: (id: string, data: Partial<ProductInput>) =>
    api.patch<Product>(`/business/products/${id}`, data),
};
