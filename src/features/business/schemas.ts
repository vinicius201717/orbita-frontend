import { z } from 'zod';
export const businessSchema = z.object({
  legalName: z.string().trim().min(2, 'Informe a razão social.').max(180),
  tradeName: z.string().trim().min(2, 'Informe o nome fantasia.').max(120),
  document: z
    .string()
    .trim()
    .regex(/^\d{11,14}$/, 'Informe de 11 a 14 dígitos, sem pontuação.'),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional, por exemplo +5562999999999.'),
  email: z.email('Informe um e-mail válido.'),
  category: z.enum(['FOOD', 'PHARMACY', 'BEVERAGE_DISTRIBUTOR']),
});
export const branchSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da unidade.').max(120),
  address: z.string().trim().min(3, 'Informe o endereço completo.').max(300),
  latitude: z.number('Informe a latitude.').min(-90).max(90),
  longitude: z.number('Informe a longitude.').min(-180).max(180),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Informe um fuso horário válido.'),
});
export type BusinessInput = z.infer<typeof businessSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
