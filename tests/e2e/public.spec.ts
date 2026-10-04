import { test, expect } from '@playwright/test';
test('public navigation, registration validation and protected redirects', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Mais entregas/ })).toBeVisible();
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
  await page.goto('/cadastro/empresa');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Informe seu nome.')).toBeVisible();
  await page.goto('/cadastro/entregador');
  await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
  for (const path of ['/termos', '/privacidade']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  for (const path of ['/app', '/app/entregador', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  }
  expect(errors).toEqual([]);
});
test('invalid credentials fail through the real identity endpoint without creating a browser session', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('admin@orbita.example');
  await page.getByLabel('Senha', { exact: true }).fill('unsubmitted-test-password');
  const response = page.waitForResponse('/api/session/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect((await response).status()).toBe(401);
  await expect(page.locator('.error-state')).toContainText(/e-mail ou senha incorretos/i);
  expect(
    (await page.context().cookies()).filter((cookie) => cookie.name.includes('orbita_session')),
  ).toHaveLength(0);
});
