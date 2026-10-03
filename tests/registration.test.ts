import { describe, it, expect } from 'vitest';
import { businessRegistrationSchema, driverRegistrationSchema } from '@/features/auth/schemas';
const account = {
  name: 'Ana Silva',
  email: 'ana@example.test',
  phone: '+5562999999999',
  password: 'long-password',
  confirmPassword: 'long-password',
};
describe('registration validation', () => {
  it('requires matching passwords before creating a business account', () => {
    const data = {
      ...account,
      legalName: 'Empresa LTDA',
      tradeName: 'Empresa',
      document: '12345678901',
      businessPhone: '+5562999999998',
      businessEmail: 'empresa@example.test',
      category: 'FOOD',
      branchName: 'Principal',
      address: 'Rua Central 123, Goiânia GO',
      latitude: -16.68,
      longitude: -49.25,
      timezone: 'America/Sao_Paulo',
    };
    expect(businessRegistrationSchema.safeParse(data).success).toBe(true);
    expect(businessRegistrationSchema.safeParse({ ...data, confirmPassword: 'different' }).success).toBe(
      false,
    );
    expect(businessRegistrationSchema.safeParse({ ...data, latitude: undefined }).success).toBe(false);
  });
  it('does not grant GPS consent implicitly and rejects invalid vehicle capacity', () => {
    const data = {
      ...account,
      type: 'MOTORCYCLE',
      plate: 'ABC1D23',
      brand: '',
      model: '',
      capacityUnits: 10,
      gpsConsent: false,
    };
    expect(driverRegistrationSchema.parse(data).gpsConsent).toBe(false);
    expect(driverRegistrationSchema.safeParse({ ...data, capacityUnits: 0 }).success).toBe(false);
  });
});
