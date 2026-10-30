import { expect, test } from '@playwright/test';
import {
  entrar,
  simularSesion,
  simularCotizacionActiva,
  cotizacion,
  pesos,
} from './apoyo/cotizacion';

test('03C y 03D: solicitud en revisión, Volver y confirmación antes de cotizar', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCotizacionActiva(page, cotizacion());
  const poliza = {
    polizaId: 'p1',
    estado: 'PENDIENTE',
    datosCredito: { entidadAcreedora: 'Bancolombia', saldoInsoluto: 320000000 },
    primaTotalMensual: 49100,
    pendientes: [
      { codigo: 'CORREO_SIN_CONFIRMAR', tipo: 'USUARIO', mensaje: 'Revisa el enlace en tu correo' },
      {
        codigo: 'EVIDENCIA_EN_REVISION',
        tipo: 'AGENTE',
        mensaje: 'Un agente está revisando tus documentos',
      },
      {
        codigo: 'CREDITO_NO_VERIFICADO',
        tipo: 'AGENTE',
        mensaje: 'Los datos de tu crédito deben ser verificados por un agente',
      },
    ],
  };
  const escrituras: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' && /\/v1\/(cuenta\/polizas|cotizaciones)/.test(r.url()))
      escrituras.push(r.method() + ' ' + r.url());
  });
  await page.route('**/v1/cuenta/polizas', (route) => route.fulfill({ json: [poliza] }));
  await page.route('**/v1/cuenta/polizas/p1', (route) => route.fulfill({ json: poliza }));
  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Tu solicitud está en revisión' })).toBeVisible();
  await expect(page.locator('.poliza-card')).toContainText(pesos(49100));
  await expect(page.locator('.pendientes-home li')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Retomar cotización vigente' })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/home-03c-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Nueva cotización' }).click();
  const modal = page.getByRole('dialog', { name: '¿Quieres hacer una nueva cotización?' });
  await expect(modal).toBeVisible();
  await page.screenshot({ path: 'test-results/home-03d-desktop.png', fullPage: true });
  await modal.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.getByRole('link', { name: 'Ver solicitud en revisión' }).click();
  await expect(
    page.getByRole('heading', { name: 'Revisamos tu solicitud', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ir a mis seguros' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Tu solicitud está en revisión' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/home-03c-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nueva cotización' }).click();
  await expect(modal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await page.getByRole('button', { name: 'Nueva cotización' }).click();
  await modal.getByRole('button', { name: 'Cotizar de nuevo' }).click();
  await expect(page).toHaveURL(/\/cuenta\/cotizaciones\/nueva$/);
  expect(escrituras).toEqual([]);
});
