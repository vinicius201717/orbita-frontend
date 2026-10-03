import { describe, expect, it } from 'vitest';
import { pinSchema, validateDocumentFile, vehicleSchema } from './schemas';
import { secondsUntilExpiry } from './offer-state';

describe('driver input contracts', () => {
  it('preserves leading zeroes in the four-digit customer PIN', () => {
    expect(pinSchema.parse({ code: '0123' }).code).toBe('0123');
    for (const code of ['123', '12345', '12a3', ' 1234', '１２３４']) {
      expect(pinSchema.safeParse({ code }).success).toBe(false);
    }
  });

  it('normalizes a plate while retaining optional vehicle constraints', () => {
    expect(vehicleSchema.parse({ type: 'MOTORCYCLE', plate: ' abc1d23 ', capacityUnits: 100 })).toEqual({
      type: 'MOTORCYCLE',
      plate: 'ABC1D23',
      capacityUnits: 100,
    });
  });

  it.each([
    { capacityUnits: 0 },
    { capacityUnits: 1.5 },
    { capacityUnits: 100001 },
    { weightCapacityGrams: 0 },
    { volumeCapacityCm3: -1 },
    { year: 1969 },
    { year: Number.NaN },
    { plate: 'AB!' },
    { type: 'BICYCLE' },
    { compatibleCategories: ['UNKNOWN'] },
  ])('rejects a vehicle outside the backend contract: %j', (override) => {
    expect(
      vehicleSchema.safeParse({ type: 'CAR', plate: 'ABC1D23', capacityUnits: 10, ...override }).success,
    ).toBe(false);
  });

  it('accepts weight, volume and categories only when explicitly provided', () => {
    expect(
      vehicleSchema.safeParse({
        type: 'VAN',
        plate: 'ABC1234',
        capacityUnits: 100000,
        weightCapacityGrams: 1000,
        volumeCapacityCm3: 20000,
        compatibleCategories: ['COLD', 'FRAGILE'],
      }).success,
    ).toBe(true);
  });

  it('closes expired and malformed offers locally without inventing validity', () => {
    const now = Date.parse('2026-10-02T12:00:00Z');
    expect(secondsUntilExpiry('2026-10-02T12:00:00Z', now)).toBe(0);
    expect(secondsUntilExpiry('2026-10-02T11:59:59Z', now)).toBe(0);
    expect(secondsUntilExpiry('invalid', now)).toBe(0);
    expect(secondsUntilExpiry('2026-10-02T12:00:01.100Z', now)).toBe(2);
  });

  it('validates a future upload against supplied policy, including empty and mismatched files', () => {
    const policy = { maxBytes: 1024, extensions: ['.pdf'], mimeTypes: ['application/pdf'] };
    expect(
      validateDocumentFile({ name: 'documento.PDF', size: 1024, type: 'application/pdf' }, policy),
    ).toBeNull();
    for (const file of [
      { name: 'documento.pdf', size: 0, type: 'application/pdf' },
      { name: 'documento.pdf', size: 1025, type: 'application/pdf' },
      { name: 'documento.exe', size: 10, type: 'application/pdf' },
      { name: 'documento.pdf', size: 10, type: 'text/plain' },
    ])
      expect(validateDocumentFile(file, policy)).not.toBeNull();
  });
});
