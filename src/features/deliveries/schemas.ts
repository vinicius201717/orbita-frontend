import { z } from 'zod';
import { cargoCategories, deliveryStatuses, incidentTypes } from './types';
const optionalInteger = (max: number) =>
  z.number().int('Informe um número inteiro.').min(1).max(max).optional();
const optionalDate = z
  .string()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Informe uma data válida.')
  .optional();
export const deliverySchema = z
  .object({
    branchId: z.uuid('Selecione uma unidade.'),
    customer: z.object({
      name: z.string().trim().min(1, 'Informe o nome do cliente.').max(120),
      phone: z
        .string()
        .refine((value) => !value || /^\+[1-9]\d{7,14}$/.test(value), 'Use o formato +5562999999999.')
        .optional(),
      optIn: z.boolean(),
    }),
    dropoff: z.object({
      latitude: z.number('Informe a latitude.').min(-90).max(90),
      longitude: z.number('Informe a longitude.').min(-180).max(180),
      complement: z.string().max(500).optional(),
    }),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Informe o item.').max(120),
          quantity: z.number().int().min(1).max(1000),
        }),
      )
      .min(1)
      .max(100),
    serviceLevel: z.enum(['ECONOMY', 'SMART', 'EXPRESS']),
    category: z.enum(cargoCategories),
    capacityUnits: optionalInteger(100000),
    weightGrams: optionalInteger(100000000),
    volumeCm3: optionalInteger(1000000000),
    temperatureRequirement: z.string().max(80).optional(),
    packageType: z.string().max(80).optional(),
    estimatedReadyAt: optionalDate,
    pickupDeadline: optionalDate,
    deliveryDeadline: optionalDate,
    maxDeliveryDurationSeconds: z.number().int().min(60).max(86400).optional(),
    externalReference: z.string().trim().max(100).optional(),
  })
  .refine((value) => !value.customer.optIn || !!value.customer.phone, {
    path: ['customer', 'phone'],
    message: 'Informe o telefone para autorizar as mensagens.',
  });
export type DeliveryInput = z.infer<typeof deliverySchema>;
export const incidentSchema = z.object({
  type: z.enum(incidentTypes),
  notes: z.string().max(2000).optional(),
});
export type IncidentInput = z.infer<typeof incidentSchema>;
export const cancelSchema = z.object({
  reason: z.string().trim().min(3, 'Descreva o motivo com ao menos 3 caracteres.').max(500),
});
const uuidOrEmpty = z.union([z.literal(''), z.uuid('Informe um identificador UUID válido.')]);
const dateOrEmpty = z.union([z.literal(''), z.iso.date('Informe uma data válida.')]);
export const deliveryFiltersSchema = z
  .object({
    status: z.union([z.literal(''), z.enum(deliveryStatuses)]),
    branchId: uuidOrEmpty,
    driverId: uuidOrEmpty,
    routeId: uuidOrEmpty,
    serviceLevel: z.enum(['', 'ECONOMY', 'SMART', 'EXPRESS']),
    from: dateOrEmpty,
    to: dateOrEmpty,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'A data final deve ser posterior à inicial.',
  });
export function deliveryPayload(value: DeliveryInput) {
  return {
    ...value,
    customer: { ...value.customer, phone: value.customer.phone || undefined },
    dropoff: { ...value.dropoff, complement: value.dropoff.complement || undefined },
    temperatureRequirement: value.temperatureRequirement || undefined,
    packageType: value.packageType || undefined,
    externalReference: value.externalReference || undefined,
    estimatedReadyAt: value.estimatedReadyAt
      ? new Date(value.estimatedReadyAt).toISOString()
      : undefined,
    pickupDeadline: value.pickupDeadline ? new Date(value.pickupDeadline).toISOString() : undefined,
    deliveryDeadline: value.deliveryDeadline
      ? new Date(value.deliveryDeadline).toISOString()
      : undefined,
  };
}
