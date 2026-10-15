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
