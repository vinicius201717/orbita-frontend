import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverOffersPage } from './offers-page';
import { driverApi } from '@/services/api/driver.api';
import { ApiError } from '@/services/api/client';
import type { DriverOffer } from './types';

const { push, notify } = vi.hoisted(() => ({ push: vi.fn(), notify: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/providers/notification-provider', () => ({ useNotify: () => ({ notify }) }));
vi.mock('@/services/api/driver.api', () => ({
  driverApi: { offers: vi.fn(), accept: vi.fn(), reject: vi.fn() },
}));

const offer = (): DriverOffer => ({
  id: 'offer-1',
  offerType: 'INSERTION',
  deliveryCount: 2,
  additionalDistanceMeters: 1500,
  additionalDurationSeconds: 300,
  offeredPayoutCents: 1000,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  approximatePickup: { latitude: -16.6, longitude: -49.2 },
});
const clients: QueryClient[] = [];
function showOffers() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <DriverOffersPage />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(driverApi.offers).mockResolvedValue([offer()]);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

describe('offer decisions', () => {
  it('disables both decisions when the offer has expired', async () => {
    vi.mocked(driverApi.offers).mockResolvedValue([
      { ...offer(), expiresAt: new Date(Date.now() - 1000).toISOString() },
    ]);
    showOffers();
    expect(await screen.findByRole('button', { name: 'Aceitar oferta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar oferta' })).toBeDisabled();
    expect(driverApi.accept).not.toHaveBeenCalled();
  });

  it('sends one acceptance for rapid duplicate clicks and navigates only after success', async () => {
    let resolveAcceptance!: (value: { id: string; routeId: string; status: 'ACCEPTED' }) => void;
    vi.mocked(driverApi.accept).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAcceptance = resolve;
        }),
    );
    showOffers();
    const button = await screen.findByRole('button', { name: 'Aceitar oferta' });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    await waitFor(() => expect(driverApi.accept).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar oferta' })).toBeDisabled();
    await act(async () => resolveAcceptance({ id: 'offer-1', routeId: 'route-1', status: 'ACCEPTED' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/entregador/rotas/route-1'));
  });

  it('keeps an expired server response as an error instead of assuming acceptance', async () => {
    vi.mocked(driverApi.accept).mockRejectedValue(
      new ApiError('OFFER_EXPIRED', 409, 'Esta oferta expirou. Atualize a lista.'),
    );
    showOffers();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar oferta' }));
    expect(await screen.findByText('Esta oferta expirou. Atualize a lista.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('requires confirmation and sends only one refusal while pending', async () => {
    vi.mocked(driverApi.reject).mockImplementation(() => new Promise(() => {}));
    showOffers();
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar oferta' }));
    expect(driverApi.reject).not.toHaveBeenCalled();
    const confirm = await screen.findByRole('button', { name: 'Confirmar' });
    act(() => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    await waitFor(() => expect(driverApi.reject).toHaveBeenCalledTimes(1));
    expect(confirm).toBeDisabled();
  });

  it('rechecks expiration after the refusal dialog has been opened', async () => {
    showOffers();
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar oferta' }));
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(driverApi.reject).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'Esta oferta expirou ou foi encerrada. Atualize as ofertas.',
      'info',
    );
  });
});
