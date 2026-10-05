import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductForm } from './product-form';
import type { Product } from './types';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('@/services/api/catalog.api', () => ({ catalogApi: mocks }));

const product: Product = {
  id: 'product-id',
  businessId: 'business-id',
  name: 'X-bacon',
  description: 'Da casa',
  category: 'Lanches',
  priceCents: 2490,
  available: true,
  createdAt: '2026-10-04T12:00:00Z',
  updatedAt: '2026-10-04T12:00:00Z',
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function setup(existing: Product | null = null) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ProductForm product={existing} categories={['Lanches']} onClose={onClose} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onClose, onSaved };
}

describe('formulário do catálogo', () => {
  it('cadastra o produto com preço em centavos e disponibilidade', async () => {
    mocks.create.mockResolvedValue(product);
    const { user, onSaved } = setup();
    await user.type(screen.getByLabelText('Nome do produto'), 'X-bacon');
    await user.type(screen.getByLabelText('Preço (R$)'), '24,90');
    await user.type(screen.getByLabelText('Categoria'), 'Lanches');
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(product));
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'X-bacon',
      description: '',
      category: 'Lanches',
      priceCents: 2490,
      available: true,
    });
  });

  it('não envia preço com mais de duas casas decimais', async () => {
    const { user } = setup(product);
    await user.clear(screen.getByLabelText('Preço (R$)'));
    await user.type(screen.getByLabelText('Preço (R$)'), '24,909');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('com até duas casas decimais');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('mantém o preenchimento quando a API falha para permitir tentar novamente', async () => {
    mocks.update.mockRejectedValue(new Error('Não foi possível salvar agora.'));
    const { user, onSaved, onClose } = setup(product);
    await user.clear(screen.getByLabelText('Nome do produto'));
    await user.type(screen.getByLabelText('Nome do produto'), 'X-bacon duplo');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar agora.');
    expect(screen.getByLabelText('Nome do produto')).toHaveValue('X-bacon duplo');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
