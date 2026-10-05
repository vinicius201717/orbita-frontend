import { describe, expect, it } from 'vitest';
import { parseProductPrice, productFormInput, productFormSchema, productPriceInput } from './schemas';

describe('preço do catálogo', () => {
  it.each([
    ['24,90', 2490],
    ['24.9', 2490],
    ['  R$ 1.234,56  ', 123456],
    ['1', 100],
    ['0,01', 1],
    ['99999,99', 9999999],
    ['100.000,00', 10000000],
    ['0,29', 29],
  ])('converte %s em centavos exatos', (value, expected) => {
    expect(parseProductPrice(value)).toBe(expected);
  });

  it.each([
    '',
    '-1',
    '0',
    '0,00',
    '1,234',
    '1.234',
    '1e3',
    '100000,01',
    '1,2,3',
    'abc',
    '1 000,00',
    'Infinity',
  ])('rejeita valor inválido %s', (value) => {
    expect(parseProductPrice(value)).toBeNull();
  });

  it('mantém os centavos ao abrir e salvar novamente um produto', () => {
    for (const cents of [1, 29, 100, 2490, 123456, 10000000]) {
      expect(parseProductPrice(productPriceInput(cents))).toBe(cents);
    }
  });
});

describe('cadastro de produto', () => {
  const values = {
    name: ' X-bacon ',
    description: ' Pão e bacon ',
    category: ' Lanches ',
    price: '24,90',
    available: true,
  };

  it('envia preço em centavos e dados sem espaços extras', () => {
    expect(productFormInput(values)).toEqual({
      name: 'X-bacon',
      description: 'Pão e bacon',
      category: 'Lanches',
      priceCents: 2490,
      available: true,
    });
  });

  it('aceita limpar a descrição e pausar o produto', () => {
    expect(productFormInput({ ...values, description: '', available: false })).toMatchObject({
      description: '',
      available: false,
    });
  });

  it('rejeita nomes e categorias vazios mesmo quando preenchidos com espaços', () => {
    expect(productFormSchema.safeParse({ ...values, name: '   ' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...values, category: '   ' }).success).toBe(false);
  });
});
