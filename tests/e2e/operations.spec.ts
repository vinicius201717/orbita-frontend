import { test, expect } from '@playwright/test';
import { account, administrator, backend, browserSession, runId } from './local-fixture';

test('real local operations: business delivery, admin approval, driver offer and PIN completion', async ({
  browser,
}) => {
  const admin = await administrator();
  const owner = await account('BUSINESS_OWNER');
  const driver = await account('DRIVER');
  const business = await backend<{ id: string }>('/businesses', owner, 'POST', {
    legalName: 'Frontend E2E LTDA',
    tradeName: 'Frontend E2E',
    document: String(Date.now()),
    phone:
      '+55' +
      String(BigInt('0x' + runId))
        .slice(0, 11)
        .padEnd(11, '0'),
    email: owner.user.email,
    category: 'FOOD',
  });
  owner.user.businessId = business.id;
  // Isolated from the demo drivers' operating area.
  const latitude = -23.31;
  const longitude = -45.91;
  const branch = await backend<{ id: string }>(`/businesses/${business.id}/branches`, owner, 'POST', {
    name: 'Unidade E2E',
    address: 'Unidade de teste local',
    latitude,
    longitude,
    timezone: 'America/Sao_Paulo',
  });
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const cleanups: (() => Promise<void>)[] = [];
  const errors: string[] = [];
  let deliveryId: string | undefined;
  try {
    for (const [index, identity] of [owner, admin, driver].entries())
      cleanups.push(await browserSession(contexts[index], identity));
    const [businessPage, adminPage, driverPage] = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    for (const page of [businessPage, adminPage, driverPage]) {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('/api/backend/') && response.status() >= 400)
          errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
      });
    }
    await businessPage.goto('/app/entregas/nova');
    await businessPage.getByLabel('Unidade', { exact: true }).selectOption(branch.id);
    await businessPage.getByLabel('Nome do cliente', { exact: true }).fill('Destinatário E2E');
    await businessPage.getByLabel('Latitude do destino', { exact: true }).fill(String(latitude + 0.002));
    await businessPage
      .getByLabel('Longitude do destino', { exact: true })
      .fill(String(longitude + 0.002));
    await businessPage.getByLabel('Item 1', { exact: true }).fill('Pedido de teste');
    await businessPage.getByLabel('Modalidade', { exact: true }).selectOption('EXPRESS');
    await businessPage.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
    await businessPage.getByRole('button', { name: 'Registrar entrega', exact: true }).click();
    await expect(
      businessPage.getByRole('heading', { name: 'Entrega registrada', exact: true }),
    ).toBeVisible();
    const href = await businessPage
      .getByRole('link', { name: 'Ver entrega', exact: true })
      .getAttribute('href');
    deliveryId = href!.split('/').pop()!;
    const pin = await backend<{ code: string }>(
      `/deliveries/${deliveryId}/customer-code`,
      owner,
      'POST',
    );
    await businessPage.getByRole('link', { name: 'Ver entrega', exact: true }).click();
    await businessPage
      .getByRole('button', { name: 'Marcar como pronto para coleta', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await backend<{ readinessStatus: string }>(`/deliveries/${deliveryId}`, owner))
            .readinessStatus,
      )
      .toBe('READY_FOR_PICKUP');

    await adminPage.goto(`/admin/entregadores/${driver.user.driverId}`);
    await adminPage.getByLabel('Resultado da análise', { exact: true }).selectOption('APPROVED');
    await adminPage.getByRole('button', { name: 'Revisar entregador', exact: true }).click();
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect
      .poll(
        async () => (await backend<{ onboardingStatus: string }>('/driver/me', driver)).onboardingStatus,
      )
      .toBe('APPROVED');
    await backend('/driver/vehicles', driver, 'POST', {
      type: 'MOTORCYCLE',
      plate: runId.slice(0, 8).toUpperCase(),
      capacityUnits: 100,
    });
    await backend('/driver/consent', driver, 'POST', { granted: true });
    await backend('/driver/me/status', driver, 'PATCH', { status: 'AVAILABLE' });
    await backend('/driver/location', driver, 'POST', {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
    await expect
      .poll(async () => (await backend<{ presence: string }>('/driver/me', driver)).presence, {
        timeout: 20000,
      })
      .toBe('FRESH');
    await backend('/admin/matching/run', admin, 'POST');
    await expect
      .poll(async () => (await backend<unknown[]>('/driver/offers', driver)).length, { timeout: 30000 })
      .toBeGreaterThan(0);
    await driverPage.goto('/app/entregador/ofertas');
    await driverPage.getByRole('button', { name: 'Aceitar oferta', exact: true }).first().click();
    await expect(driverPage).toHaveURL(/\/app\/entregador\/rotas\/[a-f0-9-]+$/);
    await driverPage.getByRole('button', { name: 'Iniciar rota', exact: true }).click();
    await driverPage.getByRole('button', { name: 'Cheguei', exact: true }).click();
    await driverPage.getByRole('button', { name: 'Confirmar coleta', exact: true }).click();
    await driverPage.getByRole('button', { name: 'Cheguei', exact: true }).click();
    await driverPage.getByLabel('Código informado pelo cliente', { exact: true }).fill(pin.code);
    await driverPage.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
    await expect
      .poll(async () => (await backend<{ status: string }>(`/deliveries/${deliveryId}`, owner)).status)
      .toBe('DELIVERED');
    // This page has stayed open since ready: its update must arrive through realtime invalidation.
    await expect(businessPage.locator('[data-status="DELIVERED"]').first()).toBeVisible();
    await driverPage.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await backend<{ currentRouteId: string | null }>('/driver/me', driver)).currentRouteId,
      )
      .toBeNull();
    for (const path of [
      '/app',
      '/app/entregas',
      '/app/financeiro',
      '/app/analytics',
      '/app/unidades',
      '/app/perfil',
      '/app/empresa/documentos',
      '/app/whatsapp',
      '/app/ajuda',
    ]) {
      await businessPage.goto(path);
      await expect(businessPage.locator('main h1')).toBeVisible();
      await expect(businessPage.getByText('Não foi possível carregar esta página.')).toHaveCount(0);
    }
    for (const path of [
      '/app/entregador',
      '/app/entregador/disponibilidade',
      '/app/entregador/ofertas',
      '/app/entregador/rotas',
      '/app/entregador/ganhos',
      '/app/entregador/veiculo',
      '/app/entregador/documentos',
      '/app/entregador/perfil',
    ]) {
      await driverPage.goto(path);
      await expect(driverPage.locator('main h1')).toBeVisible();
    }
    for (const path of [
      '/admin',
      '/admin/empresas',
      '/admin/entregadores',
      '/admin/entregas',
      '/admin/rotas',
      '/admin/incidentes',
      '/admin/financeiro',
      '/admin/zonas',
      '/admin/whatsapp',
      '/admin/configuracao',
      '/admin/metricas',
      '/admin/auditoria',
      '/admin/alertas',
      '/admin/privacidade',
    ]) {
      await adminPage.goto(path);
      await expect(adminPage.locator('main h1')).toBeVisible();
    }
    await driverPage.goto('/admin');
    await expect(driverPage).toHaveURL(/\/app\/entregador/);
    expect(errors).toEqual([]);
  } finally {
    if (deliveryId) {
      const delivery = await backend<{ status: string }>(`/deliveries/${deliveryId}`, owner).catch(
        () => null,
      );
      if (delivery && !['DELIVERED', 'CANCELLED'].includes(delivery.status))
        await backend(`/deliveries/${deliveryId}/cancel`, owner, 'POST', {
          reason: 'Encerramento do teste E2E local',
        }).catch(() => undefined);
    }
    await backend('/driver/me/status', driver, 'PATCH', { status: 'PAUSED' }).catch(() => undefined);
    for (const cleanup of cleanups) await cleanup();
    for (const context of contexts) await context.close();
    for (const identity of [owner, admin, driver])
      await backend('/auth/logout', identity, 'POST', {
        refreshToken: identity.tokens.refreshToken,
      }).catch(() => undefined);
  }
});
