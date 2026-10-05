import type { Product } from '@/features/catalog/types';
import type { Branch } from '@/features/business/types';
import type { CreateOrderInput, OrderItem } from './types';
import { normalizeCustomerPhone, type OrderFormInput } from './schemas';

export type OrderDraft = {
  input: CreateOrderInput;
  items: OrderItem[];
  subtotalCents: number;
  branchName: string;
};

export function buildOrderDraft(
  fields: OrderFormInput,
  quantities: Record<string, number>,
  products: Product[],
  branches: Branch[],
  address: { address: string; latitude: number; longitude: number } | null,
): OrderDraft {
  const activeBranches = branches.filter((branch) => branch.active);
  const branchId = fields.branchId || (activeBranches.length === 1 ? activeBranches[0].id : '');
  const branch = activeBranches.find((item) => item.id === branchId);
  if (!branch) throw new Error('Escolha a unidade que vai preparar este pedido.');
  if (
    !address?.address.trim() ||
    address.address.length > 500 ||
    !Number.isFinite(address.latitude) ||
    Math.abs(address.latitude) > 90 ||
    !Number.isFinite(address.longitude) ||
    Math.abs(address.longitude) > 180
  )
    throw new Error('Confirme o endereço de entrega e sua localização.');
  const selected = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
  if (!selected.length) throw new Error('Adicione pelo menos um produto ao pedido.');
  if (selected.length > 100) throw new Error('O pedido pode ter até 100 produtos diferentes.');
  const items = selected.map(([productId, quantity]) => {
    const product = products.find((item) => item.id === productId);
    if (!product?.available)
      throw new Error(
        `${product?.name || 'Um produto selecionado'} não está disponível. Remova-o para continuar.`,
      );
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
      throw new Error('Escolha de 1 a 100 unidades de cada produto.');
    return {
      productId,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      totalCents: product.priceCents * quantity,
    };
  });
  return {
    branchName: branch.name,
    items,
    subtotalCents: items.reduce((total, item) => total + item.totalCents, 0),
    input: {
      branchId,
      customer: {
        name: fields.customerName,
        phone: normalizeCustomerPhone(fields.customerPhone) || undefined,
        optIn: fields.customerOptIn,
      },
      dropoff: {
        latitude: address.latitude,
        longitude: address.longitude,
        complement: fields.complement || undefined,
      },
      address: address.address.trim(),
      notes: fields.notes || undefined,
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      serviceLevel: fields.serviceLevel,
      category: fields.category,
      preparationMinutes: fields.preparationMinutes,
    },
  };
}
