import { test, expect } from '@playwright/test';
import { account, browserSession } from './local-fixture';

test('driver documents use the real private multipart flow', async ({ browser }) => {
  const identity = await account('DRIVER');
  const context = await browser.newContext();
  const cleanup = await browserSession(context, identity);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/app/entregador/documentos');
    await expect(page.getByRole('heading', { name: 'Documentos do entregador' })).toBeVisible();
    await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
      name: 'identidade.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\nFrontend document fixture\n%%EOF'),
    });
    await page.getByRole('button', { name: 'Enviar documento', exact: true }).click();
    await expect(page.locator('.notifications')).toContainText('Documento enviado para análise.', {
      timeout: 30000,
    });
    await expect(page.getByText('identidade.pdf', { exact: false })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await cleanup();
    await context.close();
  }
});
