import { describe, expect, it } from 'vitest';
import { adjustmentSchema, deliveryFilterSchema, identitySchema, zoneSchema } from './schemas';

const id = 'f95efb53-416d-4368-856b-824cdd61bc17';
const adjustment = {
  walletId: id,
  amountCents: 1200,
  reason: 'Correção auditada',
  idempotencyKey: 'adjustment-test-1',
};
const boundary = JSON.stringify({
  type: 'Polygon',
  coordinates: [
    [
      [-49.3, -16.7],
      [-49.2, -16.7],
      [-49.2, -16.8],
      [-49.3, -16.7],
    ],
  ],
});

describe('Administrative form contracts', () => {
  it('accepts signed integer cents and rejects fractional or empty adjustments', () => {
    expect(adjustmentSchema.safeParse(adjustment).success).toBe(true);
    expect(adjustmentSchema.safeParse({ ...adjustment, amountCents: -1200 }).success).toBe(true);
    for (const amountCents of [0, 1.2, Number.NaN, 10000001, -10000001]) {
      expect(adjustmentSchema.safeParse({ ...adjustment, amountCents }).success).toBe(false);
    }
  });

  it('requires a valid wallet and reusable idempotency key', () => {
    expect(adjustmentSchema.safeParse({ ...adjustment, walletId: 'carteira' }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...adjustment, idempotencyKey: 'x' }).success).toBe(false);
  });

  it('validates closed geographic rings without claiming to validate topology', () => {
    expect(zoneSchema.safeParse({ name: 'Centro', city: 'Goiânia', boundary }).success).toBe(true);
    const openRing = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-49, -16],
          [-48, -16],
          [-48, -17],
          [-49, -17],
        ],
      ],
    });
    expect(zoneSchema.safeParse({ name: 'Centro', city: 'Goiânia', boundary: openRing }).success).toBe(
      false,
    );
    expect(
      zoneSchema.safeParse({ name: 'Centro', city: 'Goiânia', boundary: '{invalid}' }).success,
    ).toBe(false);
  });

  it('requires explicit evidence confirmation before recording a WhatsApp identity', () => {
    const identity = {
      entityType: 'DRIVER',
      entityId: id,
      phoneNumber: '+5562999999999',
      evidence: 'Protocolo 12345',
      confirmedEvidence: true,
    };
    expect(identitySchema.safeParse(identity).success).toBe(true);
    expect(identitySchema.safeParse({ ...identity, confirmedEvidence: false }).success).toBe(false);
    expect(identitySchema.safeParse({ ...identity, phoneNumber: '62999999999' }).success).toBe(false);
  });

  it('rejects an inverted date range before calling the deliveries API', () => {
    const filters = {
      status: '',
      businessId: '',
      branchId: '',
      driverId: '',
      routeId: '',
      serviceLevel: '',
      from: '2026-10-02T15:00',
      to: '2026-10-01T15:00',
    };
    expect(deliveryFilterSchema.safeParse(filters).success).toBe(false);
    expect(deliveryFilterSchema.safeParse({ ...filters, to: '2026-10-03T15:00' }).success).toBe(true);
  });
});
