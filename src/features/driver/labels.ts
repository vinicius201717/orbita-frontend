import { statusLabel } from '@/constants/status';
function labels<const T extends readonly string[]>(values: T): Record<T[number], string> {
  return Object.fromEntries(values.map((value) => [value, statusLabel(value)])) as Record<
    T[number],
    string
  >;
}
export const VEHICLE_LABELS = labels(['MOTORCYCLE', 'CAR', 'UTILITY', 'VAN']);
export const CARGO_LABELS = labels([
  'HOT',
  'COLD',
  'FROZEN',
  'AMBIENT',
  'FRAGILE',
  'BEVERAGE',
  'MEDICINE',
  'OTHER',
]);
export const DRIVER_STATUS_LABELS = labels(['OFFLINE', 'AVAILABLE', 'ON_ROUTE', 'PAUSED']);
export const ONBOARDING_LABELS = labels(['PENDING', 'APPROVED', 'REJECTED']);
export const INCIDENT_LABELS = {
  CUSTOMER_UNAVAILABLE: 'Cliente indisponível',
  WRONG_ADDRESS: 'Endereço incorreto',
  BUSINESS_DELAY: 'Atraso do estabelecimento',
  PRODUCT_DAMAGED: 'Produto danificado',
  DRIVER_BREAKDOWN: 'Problema no veículo',
  ACCIDENT: 'Acidente',
  CUSTOMER_REFUSED: 'Cliente recusou',
  OTHER: 'Outro',
} as const;
