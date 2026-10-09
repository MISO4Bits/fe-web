import { test, expect } from '@playwright/test';

test('alias de registro conserva la pantalla y un solo encabezado', async ({ page }) => {
  await page.goto('/registro');
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('header')).toHaveCount(1);
});

test('la muestra de Material y la ruta privada siguen disponibles', async ({ page }) => {
  await page.goto('/muestra');
  await expect(page.locator('app-muestra-tema')).toBeVisible();
  await expect(page.locator('app-layout-publico')).toBeVisible();
  await page.screenshot({ path: '/tmp/merge-muestra.png', fullPage: true });
  await page.goto('/cuenta/cotizaciones/nueva');
  await expect(page).toHaveURL(/\/ingreso\?destino=/);
  await expect(page.locator('app-login')).toBeVisible();
});
