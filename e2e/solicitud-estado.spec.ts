import { expect, test } from '@playwright/test';
import { cotizacion, entrar, simularCotizacionActiva, simularSesion } from './apoyo/cotizacion';
import { PolizaSolicitud } from '../src/app/features/solicitud/polizas-api.service';

test('BITS-97: al enviar una solicitud abre el resultado del backend', async ({ page }) => {
  await simularSesion(page);
  const actual = cotizacion();
  await simularCotizacionActiva(page, actual);
  const poliza: PolizaSolicitud = {
    polizaId: 'nueva',
    estado: 'PENDIENTE',
    pendientes: [
      {
        codigo: 'CREDITO_NO_VERIFICADO',
        tipo: 'AGENTE',
        mensaje: 'Los datos de tu crédito deben ser verificados por un agente',
      },
    ],
  };
  await page.route('**/v1/cuenta/evidencias-identidad', (route) =>
    route.fulfill({
      json: ['cedula_frente', 'cedula_reverso', 'selfie'].map((tipo) => ({
        tipo,
        estado: 'ACEPTADA',
        intentosRestantes: 3,
      })),
    }),
  );
  await page.route('**/v1/cuenta/polizas', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: [] });
    expect(route.request().postDataJSON()).toEqual({
      coberturas: ['VIDA'],
      cotizacionCreadaEn: actual.creadaEn,
      documentosAceptados: [{ tipo: 'poliza', version: 'V1' }],
    });
    return route.fulfill({ status: 201, json: poliza });
  });
  await page.route('**/v1/cuenta/polizas/nueva', (route) => route.fulfill({ json: poliza }));
  await entrar(page);
  await page.getByRole('link', { name: 'Retomar cotización vigente' }).click();
  await page
    .getByRole('checkbox', { name: 'He leído y acepto las condiciones del seguro' })
    .check();
  await page.getByRole('button', { name: 'Aceptar y continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta\/solicitudes\/nueva$/);
  await expect(
    page.getByRole('heading', { name: 'Revisamos tu solicitud', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pendientes li')).toHaveCount(1);
});

for (const estado of ['PENDIENTE', 'RECHAZADA', 'EMITIDA'] as const) {
  test(`BITS-97: abre ${estado} desde Mis seguros y muestra los datos reales`, async ({ page }) => {
    await simularSesion(page);
    const poliza: PolizaSolicitud = {
      polizaId: 'p1',
      estado,
      pendientes: [
        {
          codigo: 'CORREO_SIN_CONFIRMAR',
          tipo: 'USUARIO',
          mensaje: 'Revisa el enlace en tu correo',
        },
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
      emitidaEn: estado === 'EMITIDA' ? '2026-10-29T16:20:00Z' : null,
      vigencia:
        estado === 'EMITIDA'
          ? { desde: '2026-10-29T16:20:00Z', hasta: '2027-10-29T16:20:00Z' }
          : null,
      rechazo:
        estado === 'RECHAZADA'
          ? {
              motivos: [
                {
                  codigo: 'CREDITO_NO_VERIFICADO',
                  mensaje: 'Los datos de tu crédito no coinciden con los de tu banco.',
                },
              ],
              rechazadaEn: '2026-10-29T16:20:00Z',
            }
          : null,
    };
    await page.route('**/v1/cuenta/polizas', (route) => route.fulfill({ json: [poliza] }));
    await page.route('**/v1/cuenta/polizas/p1', (route) => route.fulfill({ json: poliza }));
    await entrar(page);
    await page.locator('.poliza-card').click();
    await expect(page).toHaveURL(/\/cuenta\/solicitudes\/p1$/);
    const titulo =
      estado === 'PENDIENTE'
        ? 'Revisamos tu solicitud'
        : estado === 'EMITIDA'
          ? 'Solicitud aprobada'
          : 'No aprobamos tu solicitud';
    await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
    if (estado === 'PENDIENTE') {
      await expect(page.locator('.pendientes li')).toHaveCount(3);
    } else {
      await expect(page.locator('.pendientes')).toHaveCount(0);
    }
    if (estado === 'EMITIDA') {
      await page.getByRole('button', { name: 'Ver los detalles' }).click();
      await expect(page).toHaveURL(/\/cuenta\/solicitudes\/p1$/);
    }
    await page.screenshot({
      path: `test-results/bits97-${estado.toLowerCase()}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/bits97-${estado.toLowerCase()}-mobile.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Ir a mis seguros' }).click();
    await expect(page).toHaveURL(/\/cuenta$/);
    if (estado === 'PENDIENTE') {
      poliza.estado = 'EMITIDA';
      poliza.pendientes = [];
      await page.locator('.poliza-card').click();
      await expect(
        page.getByRole('heading', { name: 'Solicitud aprobada', exact: true }),
      ).toBeVisible();
    }
  });
}
