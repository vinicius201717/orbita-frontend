import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinForm } from './pin-form';
import { driverApi } from '@/services/api/driver.api';
import { ApiError } from '@/services/api/client';
import type { DriverDelivery } from '../types';

vi.mock('@/providers/notification-provider', () => ({ useNotify: () => ({ notify: vi.fn() }) }));
vi.mock('@/services/api/driver.api', () => ({ driverApi: { verify: vi.fn() } }));
const clients: QueryClient[] = [];
function showPin() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <PinForm deliveryId="delivery-1" />
    </QueryClientProvider>,
  );
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

describe('customer PIN confirmation', () => {
  it('validates input locally before contacting the verification endpoint', async () => {
    showPin();
    fireEvent.change(screen.getByLabelText('Código informado pelo cliente'), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(
      await screen.findByText('Informe os quatro números recebidos do cliente.'),
    ).toBeInTheDocument();
    expect(driverApi.verify).not.toHaveBeenCalled();
  });

  it('prevents duplicate requests and clears the code after confirmed completion', async () => {
    let resolveVerification!: (value: DriverDelivery) => void;
    vi.mocked(driverApi.verify).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerification = resolve;
        }),
    );
    const { container } = showPin();
    const field = screen.getByLabelText('Código informado pelo cliente');
    fireEvent.change(field, { target: { value: '0123' } });
    const form = container.querySelector('form');
    if (!form) throw new Error('PIN form missing');
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(driverApi.verify).toHaveBeenCalledTimes(1));
    expect(driverApi.verify).toHaveBeenCalledWith('delivery-1', '0123');
    expect(field).toBeDisabled();
    await act(async () =>
      resolveVerification({ id: 'delivery-1', status: 'DELIVERED' } as DriverDelivery),
    );
    expect(await screen.findByText('Entrega confirmada.')).toBeInTheDocument();
    expect(field).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Confirmar entrega' })).toBeDisabled();
  });

  it('locks further attempts when the server reports exhausted attempts', async () => {
    vi.mocked(driverApi.verify).mockRejectedValue(
      new ApiError('PIN_LOCKED', 400, 'Verification attempts exhausted'),
    );
    showPin();
    fireEvent.change(screen.getByLabelText('Código informado pelo cliente'), {
      target: { value: '9999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(
      await screen.findByText(
        'Limite de tentativas atingido. A confirmação precisa de resolução pela operação.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar entrega' })).toBeDisabled();
  });
});
