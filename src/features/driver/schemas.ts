import { z } from 'zod';

export const vehicleSchema = z.object({
  type: z.enum(['MOTORCYCLE', 'CAR', 'UTILITY', 'VAN']),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{6,10}$/, 'Informe uma placa com 6 a 10 letras, números ou hífen.'),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  year: z.number().int().min(1970).max(2100).optional(),
  capacityUnits: z.number().int().min(1, 'Informe a capacidade.').max(100000),
  weightCapacityGrams: z.number().int().positive().optional(),
  volumeCapacityCm3: z.number().int().positive().optional(),
  compatibleCategories: z
    .array(z.enum(['HOT', 'COLD', 'FROZEN', 'AMBIENT', 'FRAGILE', 'BEVERAGE', 'MEDICINE', 'OTHER']))
    .max(8)
    .optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;
export const pinSchema = z.object({
  code: z.string().regex(/^\d{4}$/, 'Informe os quatro números recebidos do cliente.'),
});
export const driverStatusSchema = z.object({
  status: z.enum(['OFFLINE', 'AVAILABLE', 'ON_ROUTE', 'PAUSED']),
});
export const gpsConsentSchema = z.object({ granted: z.boolean() });
export const incidentSchema = z.object({
  type: z.enum([
    'CUSTOMER_UNAVAILABLE',
    'WRONG_ADDRESS',
    'BUSINESS_DELAY',
    'PRODUCT_DAMAGED',
    'DRIVER_BREAKDOWN',
    'ACCIDENT',
    'CUSTOMER_REFUSED',
    'OTHER',
  ]),
  notes: z.string().trim().max(2000).optional(),
});
export const cancellationSchema = z.object({
  reason: z.string().trim().min(3, 'Explique o motivo em pelo menos três caracteres.').max(500),
});

/** No upload constraints are invented: a future endpoint must supply this policy. */
export function validateDocumentFile(
  file: { name: string; size: number; type: string },
  policy: { maxBytes: number; extensions: string[]; mimeTypes: string[] },
): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > policy.maxBytes) return 'O arquivo excede o tamanho permitido.';
  if (!policy.extensions.map((value) => value.toLowerCase().replace(/^\./, '')).includes(extension))
    return 'Extensão de arquivo não permitida.';
  if (!policy.mimeTypes.includes(file.type)) return 'Tipo de arquivo não permitido.';
  return null;
}
