import { z } from 'zod';
export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.').max(254),
  password: z.string().min(10, 'A senha precisa ter pelo menos 10 caracteres.').max(128),
});
const account = {
  ...loginSchema.shape,
  name: z.string().min(2, 'Informe seu nome.').max(120),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use o formato internacional, por exemplo +5562999999999.'),
  confirmPassword: z.string(),
};
export const businessRegistrationSchema = z
  .object({
    ...account,
    legalName: z.string().min(2, 'Informe a razão social.').max(180),
    tradeName: z.string().min(2, 'Informe o nome fantasia.').max(120),
    document: z.string().regex(/^\d{11,14}$/, 'Informe de 11 a 14 dígitos, sem pontuação.'),
    businessPhone: account.phone,
    businessEmail: loginSchema.shape.email,
    category: z.enum(['FOOD', 'PHARMACY', 'BEVERAGE_DISTRIBUTOR']),
    branchName: z.string().min(2, 'Informe o nome da unidade.').max(120),
    address: z.string().min(3, 'Informe o endereço completo.').max(300),
    latitude: z.number('Informe a latitude.').min(-90).max(90),
    longitude: z.number('Informe a longitude.').min(-180).max(180),
    timezone: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais.',
  });
export const driverRegistrationSchema = z
  .object({
    ...account,
    type: z.enum(['MOTORCYCLE', 'CAR', 'UTILITY', 'VAN']),
    plate: z.string().regex(/^[A-Z0-9-]{6,10}$/, 'Use de 6 a 10 letras maiúsculas, números ou hífen.'),
    brand: z.string().max(80),
    model: z.string().max(80),
    capacityUnits: z.number('Informe a capacidade.').int().min(1).max(100000),
    gpsConsent: z.boolean(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais.',
  });
export type BusinessRegistration = z.infer<typeof businessRegistrationSchema>;
export type DriverRegistration = z.infer<typeof driverRegistrationSchema>;
