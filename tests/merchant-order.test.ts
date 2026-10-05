import { describe, expect, it } from 'vitest';
import { buildOrderDraft } from '@/features/orders/draft';
import { orderFormSchema } from '@/features/orders/schemas';
import { canCancelOrder, canMarkOrderReady, orderStage } from '@/features/orders/order-state';
import type { Product } from '@/features/catalog/types';
import type { Branch } from '@/features/business/types';

const product: Product = {
  id: 'p1',
  businessId: 'b1',
  name: 'X-bacon',
  description: '',
  category: 'Lanches',
  priceCents: 2490,
  available: true,
  createdAt: '',
  updatedAt: '',
};
const branch: Branch = {
  id: 'branch1',
  businessId: 'b1',
  name: 'Centro',
  address: 'Rua A',
  latitude: -16.68,
  longitude: -49.25,
  active: true,
  timezone: 'America/Sao_Paulo',
  createdAt: '',
};
const address = { address: 'Rua A, 100, Goiânia', latitude: -16.69, longitude: -49.26 };
const fields = orderFormSchema.parse({
  branchId: '',
  customerName: 'Ana',
  customerPhone: '(62) 99999-1234',
  customerOptIn: true,
  complement: '',
  notes: 'Sem cebola',
  serviceLevel: 'SMART',
  category: 'HOT',
  preparationMinutes: 15,
});
describe('merchant order composition', () => {
  it('uses the only active branch, formats Brazilian phones and sends product references without trusted prices', () => {
    const draft = buildOrderDraft(fields, { p1: 2 }, [product], [branch], address);
    expect(draft.subtotalCents).toBe(4980);
    expect(draft.input.customer.phone).toBe('+5562999991234');
    expect(draft.input.branchId).toBe(branch.id);
    expect(draft.input.items).toEqual([{ productId: 'p1', quantity: 2 }]);
    expect(draft.input).not.toHaveProperty('totalCents');
  });
  it('requires a confirmed destination and refuses unavailable or stale cart products', () => {
    expect(() => buildOrderDraft(fields, { p1: 2 }, [product], [branch], null)).toThrow('Confirme');
    expect(() =>
      buildOrderDraft(fields, { p1: 2 }, [{ ...product, available: false }], [branch], address),
    ).toThrow('não está disponível');
    expect(() => buildOrderDraft(fields, { gone: 1 }, [product], [branch], address)).toThrow(
      'não está disponível',
    );
    expect(() => buildOrderDraft(fields, { p1: 1.5 }, [product], [branch], address)).toThrow('1 a 100');
    expect(() =>
      buildOrderDraft(fields, { p1: 1 }, [product], [branch, { ...branch, id: 'other' }], address),
    ).toThrow('Escolha a unidade');
  });
  it('prioritizes terminal delivery states over preparation and limits ready actions', () => {
    expect(orderStage({ status: 'DELIVERED', readinessStatus: 'PREPARING' })).toBe('completed');
    expect(orderStage({ status: 'RETURNING', readinessStatus: 'READY_FOR_PICKUP' })).toBe('attention');
    expect(canMarkOrderReady({ status: 'PICKED_UP', readinessStatus: 'PREPARING' })).toBe(false);
    expect(canMarkOrderReady({ status: 'ASSIGNED', readinessStatus: 'PREPARING' })).toBe(true);
    expect(canCancelOrder({ status: 'DELIVERED' })).toBe(false);
    expect(canCancelOrder({ status: 'RETURNING' })).toBe(false);
  });
});
