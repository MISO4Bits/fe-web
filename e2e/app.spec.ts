import { test, expect } from '@playwright/test';

test('la aplicación carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('app-root')).toBeAttached();
});
