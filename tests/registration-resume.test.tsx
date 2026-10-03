import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessRegistrationForm } from '@/features/auth/business-registration-form';
import { DriverRegistrationForm } from '@/features/auth/driver-registration-form';
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  register: vi.fn(),
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ login: mocks.login, refresh: mocks.refresh }),
}));
vi.mock('@/services/api/client', async (original) => ({
  ...(await original<typeof import('@/services/api/client')>()),
  api: { get: mocks.get, post: mocks.post },
  requestJson: mocks.register,
}));
const id = '7d633388-c81e-498e-b9ad-a7f0de524d57';
const branch = {
  id: 'branch',
  name: 'Principal',
  address: 'Rua Central 123',
  latitude: -16.6,
  longitude: -49.2,
  timezone: 'America/Sao_Paulo',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.register.mockResolvedValue({ id });
});
async function fillAccount(driver = false) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome', { exact: true }), 'Ana Silva');
  await user.type(screen.getByLabelText('E-mail', { exact: true }), 'ana@example.test');
  await user.type(
    screen.getByLabelText(
      driver ? 'Telefone (formato internacional)' : 'Telefone da conta (formato internacional)',
    ),
    '+5562999999999',
  );
  await user.type(screen.getByLabelText('Senha', { exact: true }), 'test-password-long');
  await user.type(screen.getByLabelText('Confirmar senha'), 'test-password-long');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  return user;
}
async function fillBusiness() {
  const user = await fillAccount();
  for (const [label, value] of [
    ['Razão social', 'Empresa LTDA'],
    ['Nome fantasia', 'Empresa'],
    ['Documento (somente dígitos)', '12345678901'],
    ['Telefone da empresa', '+5562999999998'],
    ['E-mail da empresa', 'empresa@example.test'],
  ])
    await user.type(screen.getByLabelText(label, { exact: true }), value);
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  await user.type(screen.getByLabelText(/Endereço completo/), branch.address);
  await user.type(screen.getByLabelText('Latitude', { exact: true }), String(branch.latitude));
  await user.type(screen.getByLabelText('Longitude', { exact: true }), String(branch.longitude));
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  return user;
}
describe('registration resumes the same account without repeating completed writes', () => {
  it('does not duplicate the branch after identity refresh fails and freezes account fields', async () => {
    mocks.login
      .mockResolvedValueOnce({ id, role: 'BUSINESS_OWNER', businessId: null })
      .mockResolvedValue({ id, role: 'BUSINESS_OWNER', businessId: 'company' });
    mocks.get.mockResolvedValue([]);
    mocks.post.mockResolvedValueOnce({ id: 'company' }).mockResolvedValueOnce(branch);
    mocks.refresh.mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValue({ id });
    render(<BusinessRegistrationForm />);
    const user = await fillBusiness();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    await screen.findByText('Falha de rede');
    await user.click(screen.getByRole('button', { name: 'Retomar cadastro' }));
    expect(mocks.push).toHaveBeenCalledWith('/app/onboarding');
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 3; index++)
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('E-mail', { exact: true })).toHaveAttribute('readonly');
    expect(mocks.login).toHaveBeenLastCalledWith('ana@example.test', 'test-password-long');
  });
  it('reconciles a branch when the successful POST response was lost', async () => {
    mocks.login.mockResolvedValue({ id, role: 'BUSINESS_OWNER', businessId: 'company' });
    mocks.get.mockResolvedValueOnce([]).mockResolvedValue([branch]);
    mocks.post.mockRejectedValueOnce(new Error('Resposta perdida'));
    mocks.refresh.mockResolvedValue({ id });
    render(<BusinessRegistrationForm />);
    const user = await fillBusiness();
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    await screen.findByText('Resposta perdida');
    await user.click(screen.getByRole('button', { name: 'Retomar cadastro' }));
    expect(mocks.push).toHaveBeenCalledWith('/app/onboarding');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('reconciles the vehicle after an ambiguous response before retrying onboarding', async () => {
    mocks.login.mockResolvedValue({ id, role: 'DRIVER' });
    mocks.get
      .mockResolvedValueOnce({ userId: id, vehicles: [] })
      .mockResolvedValue({ userId: id, vehicles: [{ plate: 'ABC1D23', active: true }] });
    mocks.post.mockRejectedValueOnce(new Error('Resposta perdida'));
    mocks.refresh.mockResolvedValue({ id });
    render(<DriverRegistrationForm />);
    const user = await fillAccount(true);
    await user.type(screen.getByLabelText('Placa (letras maiúsculas)'), 'ABC1D23');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }));
    await screen.findByText('Resposta perdida');
    await user.click(screen.getByRole('button', { name: 'Retomar cadastro' }));
    expect(mocks.push).toHaveBeenCalledWith('/app/entregador/onboarding');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });
});
