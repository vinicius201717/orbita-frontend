import { z } from 'zod';

export const DELIVERY_FILTER_STATUSES = [
  'CREATED',
  'WAITING_POOL',
  'MATCHING',
  'OFFERED',
  'ASSIGNED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVING',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'RETURN_REQUIRED',
  'RETURNING',
  'RETURNED',
] as const;
const optionalUuid = z.union([z.literal(''), z.uuid('Informe um UUID válido.')]);

export const deliveryFilterSchema = z
  .object({
    status: z.union([z.literal(''), z.enum(DELIVERY_FILTER_STATUSES)]),
    businessId: optionalUuid,
    branchId: optionalUuid,
    driverId: optionalUuid,
    routeId: optionalUuid,
    serviceLevel: z.union([z.literal(''), z.enum(['ECONOMY', 'SMART', 'EXPRESS'])]),
    from: z.string().refine((value) => !value || Number.isFinite(Date.parse(value)), 'Data inválida.'),
    to: z.string().refine((value) => !value || Number.isFinite(Date.parse(value)), 'Data inválida.'),
  })
  .refine((value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to), {
    message: 'O fim deve ser posterior ao início.',
    path: ['to'],
  });

export const deliveryActionSchema = z.object({
  action: z.enum(['confirm', 'reassign']),
  reason: z.string().trim().min(3, 'Informe o motivo com pelo menos 3 caracteres.').max(500),
});

export const adjustmentSchema = z.object({
  walletId: z.uuid('Informe o ID de uma carteira.'),
  amountCents: z
    .number('Informe um valor em centavos.')
    .int('Use centavos inteiros.')
    .min(-10_000_000)
    .max(10_000_000)
    .refine((value) => value !== 0, 'Informe um valor diferente de zero.'),
  reason: z.string().trim().min(5, 'Descreva o motivo com pelo menos 5 caracteres.').max(500),
  idempotencyKey: z
    .string()
    .regex(
      /^[\w.-]{8,100}$/,
      'A chave deve conter 8 a 100 letras, números, pontos, traços ou sublinhados.',
    ),
});

const point = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const ring = z
  .array(point)
  .min(4)
  .max(200)
  .refine(
    (points) => JSON.stringify(points[0]) === JSON.stringify(points.at(-1)),
    'O anel deve terminar na mesma coordenada em que começa.',
  );
export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(ring).min(1).max(10),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  boundary: z
    .string()
    .max(100_000)
    .superRefine((value, context) => {
      try {
        const parsed: unknown = JSON.parse(value);
        if (!polygonSchema.safeParse(parsed).success)
          context.addIssue({
            code: 'custom',
            message:
              'Informe um GeoJSON Polygon válido, com anéis fechados e coordenadas [longitude, latitude].',
          });
      } catch {
        context.addIssue({ code: 'custom', message: 'O GeoJSON precisa ser um JSON válido.' });
      }
    }),
});

export const identitySchema = z.object({
  entityType: z.enum(['BUSINESS', 'DRIVER']),
  entityId: z.uuid('Informe um UUID válido.'),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional, por exemplo +5562999999999.'),
  evidence: z
    .string()
    .trim()
    .min(5, 'Informe a referência da evidência de verificação e consentimento.')
    .max(200),
  confirmedEvidence: z
    .boolean()
    .refine((value) => value, 'Confirme que as evidências foram verificadas.'),
});
