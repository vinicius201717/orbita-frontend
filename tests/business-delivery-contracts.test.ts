import { afterEach, describe, expect, it, vi } from 'vitest';
import { businessSchema, branchSchema } from '@/features/business/schemas';
import {
  cancelSchema,
  deliveryFiltersSchema,
  deliveryPayload,
  deliverySchema,
  type DeliveryInput,
} from '@/features/deliveries/schemas';
import { deliveryApi } from '@/services/api/delivery.api';
import { api } from '@/services/api/client';

const draft: DeliveryInput = {
  branchId: '123e4567-e89b-42d3-a456-426614174000',
  customer: { name: 'Ana', phone: '', optIn: false },
  dropoff: { latitude: -16.68, longitude: -49.25, complement: '' },
  items: [{ name: 'Pedido', quantity: 1 }],
  serviceLevel: 'SMART',
  category: 'AMBIENT',
};
afterEach(() => vi.restoreAllMocks());
describe('business and delivery contracts', () => {
  it('accepts optional cargo fields without inventing capacity or pricing', () => {
    const parsed = deliverySchema.parse(draft);
    expect(parsed.capacityUnits).toBeUndefined();
    expect(parsed.weightGrams).toBeUndefined();
    expect(parsed).not.toHaveProperty('revenueCents');
    expect(deliverySchema.safeParse({ ...draft, weightGrams: 0 }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...draft, items: [] }).success).toBe(false);
    expect(
      deliverySchema.safeParse({ ...draft, items: [{ name: 'Pedido', quantity: 1.5 }] }).success,
    ).toBe(false);
    expect(deliverySchema.safeParse({ ...draft, dropoff: { latitude: 91, longitude: 0 } }).success).toBe(
      false,
    );
  });
  it('requires a valid telephone for messaging consent', () => {
    expect(
      deliverySchema.safeParse({ ...draft, customer: { ...draft.customer, optIn: true } }).success,
    ).toBe(false);
    expect(
      deliverySchema.safeParse({
        ...draft,
        customer: { ...draft.customer, phone: '+5562999999999', optIn: true },
      }).success,
    ).toBe(true);
    expect(
      deliverySchema.safeParse({ ...draft, customer: { ...draft.customer, phone: '62999999999' } })
        .success,
    ).toBe(false);
  });
  it('omits empty optional values and sends dates in UTC without shifting instants', () => {
    const payload = deliveryPayload({ ...draft, estimatedReadyAt: '2026-10-03T10:30:00-03:00' });
    expect(payload.estimatedReadyAt).toBe('2026-10-03T13:30:00.000Z');
    expect(JSON.stringify(payload)).not.toContain('"phone"');
    expect(payload.pickupDeadline).toBeUndefined();
  });
  it('reuses the provided request key and preserves an explicit external reference', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    await deliveryApi.create(draft, 'request-1');
    await deliveryApi.create(draft, 'request-1');
    expect(post.mock.calls[0][2]).toEqual({ 'Idempotency-Key': 'request-1' });
    expect(post.mock.calls[1][2]).toEqual({ 'Idempotency-Key': 'request-1' });
    await deliveryApi.create({ ...draft, externalReference: 'Loja 42 / pedido 7' }, 'ignored-key');
    expect(post.mock.calls[2][1]).toMatchObject({ externalReference: 'Loja 42 / pedido 7' });
    expect(post.mock.calls[2][2]).toBeUndefined();
  });
  it('uses real action bodies and the partial cancellation response', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ id: 'delivery', status: 'RETURN_REQUIRED' });
    await deliveryApi.ready('delivery');
    expect(post).toHaveBeenLastCalledWith('/deliveries/delivery/ready');
    expect(await deliveryApi.cancel('delivery', 'Cliente solicitou')).toEqual({
      id: 'delivery',
      status: 'RETURN_REQUIRED',
    });
    expect(post).toHaveBeenLastCalledWith('/deliveries/delivery/cancel', {
      reason: 'Cliente solicitou',
    });
    expect(cancelSchema.safeParse({ reason: '  ' }).success).toBe(false);
  });
  it('rejects malformed dates and backwards ranges before filtering', () => {
    const filters = {
      status: '',
      branchId: '',
      driverId: '',
      routeId: '',
      serviceLevel: '',
      from: '',
      to: '',
    };
    expect(deliveryFiltersSchema.safeParse(filters).success).toBe(true);
    expect(deliveryFiltersSchema.safeParse({ ...filters, from: '2026-02-30' }).success).toBe(false);
    expect(
      deliveryFiltersSchema.safeParse({ ...filters, from: '2026-10-04', to: '2026-10-03' }).success,
    ).toBe(false);
    expect(deliveryFiltersSchema.safeParse({ ...filters, driverId: 'someone' }).success).toBe(false);
  });
  it('validates business identifiers and branch geolocation/timezone', () => {
    const business = {
      legalName: 'Empresa Ltda',
      tradeName: 'Loja',
      document: '12345678901',
      phone: '+5562999999999',
      email: 'loja@example.test',
      category: 'FOOD',
    };
    expect(businessSchema.safeParse(business).success).toBe(true);
    expect(businessSchema.safeParse({ ...business, document: '123.456' }).success).toBe(false);
    const branch = {
      name: 'Principal',
      address: 'Rua Um 123',
      latitude: -16.68,
      longitude: -49.25,
      timezone: 'America/Sao_Paulo',
    };
    expect(branchSchema.safeParse(branch).success).toBe(true);
    expect(branchSchema.safeParse({ ...branch, timezone: 'invalid/zone' }).success).toBe(false);
    expect(branchSchema.safeParse({ ...branch, longitude: 181 }).success).toBe(false);
  });
});
