import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryAddressField, type DeliveryAddress } from '@/features/orders-address/address-field';

const mocks = vi.hoisted(() => ({ post: vi.fn(), changed: vi.fn() }));
vi.mock('@/services/api/client', async (original) => ({
  ...(await original<typeof import('@/services/api/client')>()),
  api: { post: mocks.post },
}));
function AddressForm() {
  const [value, setValue] = useState<DeliveryAddress | null>(null);
  return <DeliveryAddressField value={value} onChange={(next) => { mocks.changed(next); setValue(next); }} />;
}
beforeEach(() => vi.resetAllMocks());
async function start() {
  const user = userEvent.setup();
  render(<AddressForm />);
  await user.type(screen.getByLabelText('Endereço da entrega'), 'Rua Central 123, Goiânia');
  return user;
}

describe('delivery location confirmation', () => {
  it('does not turn an address without coordinates into a confirmed point at zero', async () => {
    const user = await start();
    expect(mocks.changed.mock.calls.every(([value]) => value === null)).toBe(true);
    await user.click(screen.getByText('Usar um ponto do Google Maps'));
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
    expect(mocks.changed.mock.calls.every(([value]) => value === null)).toBe(true);
    await user.type(screen.getByLabelText('Latitude'), '-16.6');
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
    expect(mocks.changed.mock.calls.every(([value]) => value === null)).toBe(true);
  });

  it('accepts an explicit zero only after both coordinates and confirmation', async () => {
    const user = await start();
    await user.click(screen.getByText('Usar um ponto do Google Maps'));
    await user.type(screen.getByLabelText('Latitude'), '0');
    await user.type(screen.getByLabelText('Longitude'), '0');
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(mocks.changed).toHaveBeenLastCalledWith({ address: 'Rua Central 123, Goiânia', latitude: 0, longitude: 0 });
    expect(screen.getByText('✓ Local confirmado')).toBeInTheDocument();
  });

  it('synchronizes the selected result and clears it when the address changes', async () => {
    mocks.post.mockResolvedValue({ items: [{ address: 'Rua Central 123', latitude: -16.6, longitude: -49.2, approximate: false }] });
    const user = await start();
    await user.click(screen.getByRole('button', { name: 'Buscar endereço' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar este local' }));
    expect(screen.getByLabelText('Latitude')).toHaveValue(-16.6);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-49.2);
    expect(screen.getByText('✓ Local confirmado')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Endereço da entrega'), ' - outro número');
    expect(mocks.changed).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveValue(null);
    expect(screen.getByLabelText('Longitude')).toHaveValue(null);
    await user.click(screen.getByText('Usar um ponto do Google Maps'));
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
  });

  it('invalidates a manual location when either coordinate changes', async () => {
    const user = await start();
    await user.click(screen.getByText('Usar um ponto do Google Maps'));
    await user.type(screen.getByLabelText('Coordenadas ou link completo do ponto'), '-16.6,-49.2');
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(screen.getByText('✓ Local confirmado')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Longitude'));
    expect(mocks.changed).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
  });

  it('does not fall back to old coordinates after an invalid map link', async () => {
    const user = await start();
    await user.click(screen.getByText('Usar um ponto do Google Maps'));
    await user.type(screen.getByLabelText('Coordenadas ou link completo do ponto'), '-16.6,-49.2');
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    await user.type(screen.getByLabelText('Coordenadas ou link completo do ponto'), 'https://maps.app.goo.gl/unresolved');
    await user.click(screen.getByRole('button', { name: 'Confirmar este ponto' }));
    expect(mocks.changed).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText('✓ Local confirmado')).not.toBeInTheDocument();
  });
});
