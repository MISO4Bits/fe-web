import { expect, Page, test } from '@playwright/test';
import {
  abrirNuevaCotizacion,
  cotizacion,
  cotizarConDatosDelBanco,
  entrar,
  esperarCotizacion,
  simularCotizacionActiva,
  simularCreditoDelBanco,
  simularCrearCotizacion,
  simularSesion,
  tarjetaCotizacionEnCurso,
} from './apoyo/cotizacion';

// BITS-220: de la cotización al envío de la solicitud. La selfie web solo se toma con la cámara,
// así que Chromium usa su cámara simulada.
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

// PNG de 1 × 1: pasa la revisión de firma y de lectura de PrepararImagenService.
const FOTO = {
  name: 'cedula.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
};

async function retomarCotizacion(page: Page) {
  await entrar(page);
  await tarjetaCotizacionEnCurso(page).click();
  await esperarCotizacion(page);
}

test('BITS-337: Volver conserva la cotización y confirmar la elimina y lleva al Inicio', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCotizacionActiva(page, cotizacion());
  const eliminadas: string[] = [];
  await page.route('**/v1/cotizaciones/actual', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    eliminadas.push(route.request().url());
    await simularCotizacionActiva(page, null);
    return route.fulfill({ status: 204 });
  });

  await retomarCotizacion(page);
  const declinar = page.getByRole('button', { name: 'Declinar estas condiciones' });
  const modal = page.getByRole('dialog', { name: '¿Quieres declinar estas condiciones?' });

  await declinar.click();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page).toHaveURL(/\/cuenta\/cotizaciones\/actual$/);
  await expect(page.getByRole('heading', { name: 'Seguro de vida deudores' })).toBeVisible();
  expect(eliminadas).toEqual([]);

  await declinar.click();
  await modal.getByRole('button', { name: 'Declinar estas condiciones' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole('heading', { name: 'Todavía no tienes seguros ni cotizaciones' }),
  ).toBeVisible();
  await expect(tarjetaCotizacionEnCurso(page)).toHaveCount(0);
  expect(eliminadas).toHaveLength(1);
});

test('BITS-275, BITS-235 y BITS-101: Enviar solo se habilita con las dos caras y la selfie', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCotizacionActiva(page, cotizacion());
  const subidas: string[] = [];
  await page.route('**/v1/cuenta/evidencias-identidad', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        json: ['cedula_frente', 'cedula_reverso', 'selfie'].map((tipo) => ({
          tipo,
          estado: 'PENDIENTE',
          intentosRestantes: 3,
        })),
      });
    }
    const tipo = /name="tipo"\r\n\r\n(\w+)/.exec(route.request().postData() ?? '')?.[1] ?? '';
    subidas.push(tipo);
    return route.fulfill({
      status: 201,
      json: { tipo, estado: 'ACEPTADA', evidenciaId: `e-${tipo}`, intentosRestantes: 3 },
    });
  });
  await page.route('**/v1/cuenta/polizas', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 201, json: { polizaId: 'p1', estado: 'EMITIDA', pendientes: [] } })
      : route.fallback(),
  );

  await retomarCotizacion(page);
  await page
    .getByRole('checkbox', { name: 'He leído y acepto las condiciones del seguro' })
    .check();
  await page.getByRole('button', { name: 'Aceptar y continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta\/solicitud$/);
  await expect(
    page.getByRole('heading', { name: 'Tu solicitud de cambio de seguro' }),
  ).toBeVisible();

  const enviar = page.getByRole('button', { name: 'Enviar solicitud', exact: true });
  const selfie = page.getByRole('button', { name: 'Tomar la selfie' });
  await expect(enviar).toBeDisabled();
  await expect(selfie).toBeDisabled();

  await page.getByLabel('Cargar Frente de tu cédula').setInputFiles(FOTO);
  await expect(page.getByRole('region', { name: 'Frente de tu cédula' })).toContainText(
    'Se ve bien',
  );
  await expect(selfie).toBeDisabled();
  await expect(enviar).toBeDisabled();

  await page.getByLabel('Cargar Reverso de tu cédula').setInputFiles(FOTO);
  await expect(page.getByRole('region', { name: 'Reverso de tu cédula' })).toContainText(
    'Se ve bien',
  );
  await expect(selfie).toBeEnabled();
  await expect(enviar).toBeDisabled();

  await selfie.click();
  // capturar() no hace nada hasta que el video tenga imagen.
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Capturar foto' }).click();
  await expect(page.getByRole('button', { name: 'Tomarla otra vez' })).toBeVisible();
  await expect(enviar).toBeEnabled();
  expect(subidas).toEqual(['cedula_frente', 'cedula_reverso', 'selfie']);

  await enviar.click();
  await expect(page).toHaveURL(/\/cuenta\/solicitudes\/p1$/);
});

test('BITS-97: el Inicio muestra la solicitud no aprobada con su motivo', async ({ page }) => {
  await simularSesion(page);
  const motivo = 'Los datos de tu crédito no coinciden con los de tu banco.';
  const poliza = {
    polizaId: 'p1',
    estado: 'RECHAZADA',
    datosCredito: { entidadAcreedora: 'Bancolombia', saldoInsoluto: 320000000 },
    primaTotalMensual: 49100,
    pendientes: [],
    rechazo: {
      motivos: [{ codigo: 'CREDITO_NO_VERIFICADO', mensaje: motivo }],
      rechazadaEn: '2026-10-29T16:20:00Z',
    },
  };
  await page.route('**/v1/cuenta/polizas', (route) => route.fulfill({ json: [poliza] }));
  await page.route('**/v1/cuenta/polizas/p1', (route) => route.fulfill({ json: poliza }));

  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Tu solicitud no fue aprobada' })).toBeVisible();
  const tarjeta = page.getByRole('link', { name: 'Ver solicitud no aprobada' });
  await expect(tarjeta).toContainText('No aprobada');
  await expect(tarjeta).toContainText(`Motivo: ${motivo}`);
  await expect(page.locator('.pendientes-home')).toHaveCount(0);

  await tarjeta.click();
  await expect(page).toHaveURL(/\/cuenta\/solicitudes\/p1$/);
  await expect(
    page.getByRole('heading', { name: 'No aprobamos tu solicitud', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Motivo: ${motivo}`)).toBeVisible();
});

test('BITS-333: con datos del banco no aparece el aviso de datos declarados', async ({ page }) => {
  await simularSesion(page);
  await simularCreditoDelBanco(page);
  await simularCrearCotizacion(page, { ...cotizacion(), origenDatos: 'CONFIRMADO' });

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);

  await expect(page.getByText('Los datos de tu crédito vienen de tu banco.')).toBeVisible();
  await expect(page.getByText(/tú declaraste/)).toHaveCount(0);
  await expect(page.getByText('Los datos de tu crédito son declarados')).toHaveCount(0);
});
