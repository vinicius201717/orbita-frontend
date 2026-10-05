import { z } from 'zod';
import type { ProductInput } from './types';

/** Converts the entered currency using integers, so a price never gains rounding cents. */
export function parseProductPrice(value: string): number | null {
  const normalized = value.trim().replace(/^R\$\s*/, '');
  const grouped = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(normalized);
  if (!grouped && !/^\d+(?:[,.]\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = (grouped ? normalized.replaceAll('.', '') : normalized).split(/[,.]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= 1 && cents <= 10_000_000 ? cents : null;
}

export function productPriceInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do produto.').max(120, 'Use até 120 caracteres.'),
  description: z.string().trim().max(500, 'Use até 500 caracteres.'),
  category: z.string().trim().min(1, 'Informe uma categoria.').max(60, 'Use até 60 caracteres.'),
  price: z
    .string()
    .refine(
      (value) => parseProductPrice(value) !== null,
      'Informe um preço entre R$ 0,01 e R$ 100.000,00, com até duas casas decimais.',
    ),
  available: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function productFormInput(values: ProductFormValues): ProductInput {
  const validated = productFormSchema.parse(values);
  const priceCents = parseProductPrice(validated.price);
  if (priceCents === null) throw new Error('Preço inválido.');
  return {
    name: validated.name,
    description: validated.description,
    category: validated.category,
    priceCents,
    available: validated.available,
  };
}
