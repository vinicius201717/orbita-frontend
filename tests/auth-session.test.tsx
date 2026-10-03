import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
const user = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ana',
  email: 'ana@example.test',
  role: 'BUSINESS_OWNER',
  businessId: null,
  driverId: null,
};
function Probe() {
  const auth = useAuth();
  return (
    <>
      <p>{auth.isLoading ? 'Carregando' : (auth.user?.name ?? 'Visitante')}</p>
      <button onClick={() => void auth.login('ana@example.test', 'valid-password')}>Login</button>
      <button onClick={() => void auth.logout()}>Logout</button>
    </>
  );
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return client;
}
function pendingResponse() {
  let resolve: (value: Response) => void = () => {};
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('auth session', () => {
  it('loads, logs in, clears private cache and logs out without local storage tokens', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(Response.json({ user }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    const client = setup();
    await screen.findByText('Visitante');
    client.setQueryData(['private'], { secret: 'other-session' });
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByText('Ana');
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(localStorage.length).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByText('Visitante')).toBeInTheDocument());
    expect(fetchMock.mock.calls[1][1].credentials).toBe('same-origin');
  });
  it.each([
    { id: '123e4567-e89b-42d3-a456-426614174010' },
    { role: 'BUSINESS_STAFF' },
    { businessId: '123e4567-e89b-42d3-a456-426614174011' },
    { driverId: '123e4567-e89b-42d3-a456-426614174012' },
  ])('clears private cache when focus discovers changed auth scope %j', async (change) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ user }))
        .mockResolvedValueOnce(Response.json({ user: { ...user, ...change, name: 'Outra sessão' } })),
    );
    const client = setup();
    await screen.findByText('Ana');
    client.setQueryData(['driver', 'wallet', ''], { privateBalance: 1500 });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await screen.findByText('Outra sessão');
    expect(client.getQueryData(['driver', 'wallet', ''])).toBeUndefined();
  });
  it('keeps cache when only the same user display name changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ user }))
        .mockResolvedValueOnce(Response.json({ user: { ...user, name: 'Ana Silva' } })),
    );
    const client = setup();
    await screen.findByText('Ana');
    client.setQueryData(['private'], { value: 1 });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await screen.findByText('Ana Silva');
    expect(client.getQueryData(['private'])).toEqual({ value: 1 });
  });
  it('does not restore a logged-out user when an earlier refresh completes', async () => {
    const pending = pendingResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user }))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    const client = setup();
    await screen.findByText('Ana');
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByText('Visitante');
    await act(async () => {
      pending.resolve(Response.json({ user }));
    });
    expect(screen.getByText('Visitante')).toBeInTheDocument();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it('does not replace a newer login with an earlier session refresh', async () => {
    const pending = pendingResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user }))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(Response.json({ user: { ...user, id: 'new-id', name: 'Bruna' } }));
    vi.stubGlobal('fetch', fetchMock);
    setup();
    await screen.findByText('Ana');
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByText('Bruna');
    await act(async () => {
      pending.resolve(Response.json({ user }));
    });
    expect(screen.getByText('Bruna')).toBeInTheDocument();
  });
  it('ignores pending refresh after the session-expired event', async () => {
    const pending = pendingResponse();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pending.promise));
    setup();
    act(() => {
      window.dispatchEvent(new Event('orbita:session-expired'));
    });
    await screen.findByText('Visitante');
    await act(async () => {
      pending.resolve(Response.json({ user }));
    });
    expect(screen.getByText('Visitante')).toBeInTheDocument();
  });
  it('does not refresh identity while a login is changing the server session', async () => {
    const pending = pendingResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    setup();
    await screen.findByText('Visitante');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      pending.resolve(Response.json({ user }));
    });
    await screen.findByText('Ana');
  });
});
