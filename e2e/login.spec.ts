import { test, expect } from '@playwright/test';

test('la ruta principal abre login y solo el enlace de registro abre crear cuenta', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole('heading', { name: 'Entra a tu cuenta' })).toBeVisible();
  await expect(page.locator('#correo-login')).toHaveValue('');
  await expect(page.locator('#clave-login')).toHaveValue('');

  await page.getByRole('link', { name: 'Crear cuenta nueva' }).click();
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await page.getByRole('link', { name: 'Solventa', exact: true }).click();
  await expect(page).toHaveURL(/\/ingreso$/);
});

test('login válido redirige al Home privado', async ({ page }) => {
  await page.route('**/v1/sesiones', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: 'usuario@example.com',
      password: 'ClaveDemo123',
    });
    await route.fulfill({
      json: {
        accessToken: 'access-prueba',
        refreshToken: 'refresh-prueba',
        tokenType: 'Bearer',
        expiresIn: 3600,
      },
    });
  });
  await page.route('**/v1/cuenta', async (route) => {
    expect(route.request().headers()['authorization']).toBe('Bearer access-prueba');
    await route.fulfill({
      json: { clienteId: 'test', primerNombre: 'Sofía', email: 'usuario@example.com' },
    });
  });

  await page.goto('/');
  await page.locator('#correo-login').fill('usuario@example.com');
  await page.locator('#clave-login').fill('ClaveDemo123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole('heading', { name: 'Todavía no tienes seguros', exact: true }),
  ).toBeVisible();
});

for (const email of [
  'admin@solventa4bits.com',
  'socio@solventa4bits.com',
  'ADMIN@SOLVENTA4BITS.COM',
]) {
  test(`cuenta interna ${email} recibe el mensaje de Backoffice`, async ({ page }) => {
    let solicitudes = 0;
    await page.route('**/v1/sesiones', async (route) => {
      solicitudes++;
      await route.fulfill({ status: 401, json: {} });
    });
    await page.goto('/ingreso');
    await page.locator('#correo-login').fill(email);
    await page.locator('#clave-login').fill('ClaveLocal123');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Tu acceso es por el Backoffice');
    await expect(page).toHaveURL(/\/ingreso$/);
    await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(0);
    expect(solicitudes).toBe(0);
    await page.locator('#correo-login').fill('cliente@correo.com');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('E00 muestra el enlace desde el inicio y navega al Backoffice local', async ({ page }) => {
  await page.goto('/ingreso');
  await expect(page.locator('#correo-login')).toHaveValue('');
  await expect(page.locator('#clave-login')).toHaveValue('');
  const link = page.getByRole('link', { name: 'Backoffice', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'http://localhost:4201/ingreso');
  await page.route('http://localhost:4201/ingreso', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Backoffice local</h1>' }),
  );
  await link.click();
  await expect(page).toHaveURL('http://localhost:4201/ingreso');
  await expect(page.getByRole('heading', { name: 'Backoffice local' })).toBeVisible();
});

test('E00 conserva el enlace y los controles del encabezado en movil', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/ingreso');
    await expect(page.getByRole('link', { name: 'Backoffice', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accesibilidad', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
