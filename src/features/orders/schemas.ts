import { z } from 'zod';
import { cargoCategories } from '@/features/deliveries/types';

export function normalizeCustomerPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return '+' + digits;
  if (digits.length === 10 || digits.length === 11) return '+55' + digits;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return '+' + digits;
  return trimmed;
}

export const orderFormSchema = z
  .object({
    branchId: z.string(),
    customerName: z.string().trim().min(1, 'Informe o nome do cliente.').max(120),
    customerPhone: z.string().refine((value) => {
      const phone = normalizeCustomerPhone(value);
      return !phone || /^\+[1-9]\d{7,14}$/.test(phone);
    }, 'Informe um telefone com DDD, como (11) 99999-9999.'),
    customerOptIn: z.boolean(),
    complement: z.string().trim().max(500),
    notes: z.string().trim().max(500),
    serviceLevel: z.enum(['SMART', 'ECONOMY', 'EXPRESS']),
    category: z.enum(cargoCategories),
    preparationMinutes: z.number().int('Use minutos inteiros.').min(0).max(120),
  })
  .refine((value) => !value.customerOptIn || !!value.customerPhone.trim(), {
    path: ['customerPhone'],
    message: 'Informe o telefone para autorizar as mensagens.',
  });
export type OrderFormInput = z.infer<typeof orderFormSchema>;
