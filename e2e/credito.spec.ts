import { test, expect, Page, Route } from '@playwright/test';

// BITS-145: recorrido web del Sprint 1, tramo de banco y datos del crédito (BITS-219).
// El BFF se simula con page.route; la aplicación usa sus adaptadores reales.
// La sesión vive en memoria, así que cada prueba entra por el login y navega dentro de la app.

const FECHA_CONSULTA = '2026-10-17T14:30:00Z';

const CREDITO_BANCOLOMBIA = {
  entidadId: 'bancolombia',
  entidadNombre: 'Bancolombia',
  valorCredito: 250000000,
  saldoInsoluto: 180000000,
  plazoRestanteMeses: 168,
  cuotaMensual: 2100000,
};

const ENTIDADES = [
  { id: 'bancolombia', nombre: 'Bancolombia' },
  { id: 'davivienda', nombre: 'Davivienda' },
];

function respuestaCreditos(estado: string, creditos: object[] = []) {
  return {
    estado,
    creditos,
    entidades: ENTIDADES,
    origen: 'OPEN_FINANCE',
    fechaConsulta: estado === 'DISPONIBLE' ? FECHA_CONSULTA : null,
  };
}

const CONSENTIMIENTO_OPEN_FINANCE = [{ scope: 'OPEN_FINANCE', estado: 'OTORGADO', vigente: true }];

async function simularSesion(page: Page, consentimientos: object[] = CONSENTIMIENTO_OPEN_FINANCE) {
  await page.route('**/v1/sesiones', (route) =>
    route.fulfill({
      json: {
        accessToken: 'access-prueba',
        refreshToken: 'refresh-prueba',
        tokenType: 'Bearer',
        expiresIn: 3600,
      },
    }),
  );
  await page.route('**/v1/cuenta', (route) =>
    route.fulfill({
      json: { clienteId: 'test', primerNombre: 'Sofía', email: 'usuario@example.com' },
    }),
  );
  await page.route('**/v1/cuenta/consentimientos', (route) =>
    route.fulfill({ json: consentimientos }),
  );
}

function simularCreditos(page: Page, responder: (route: Route, intento: number) => Promise<void>) {
  let intentos = 0;
  return page.route('**/v1/creditos-hipotecarios**', async (route) => {
    intentos += 1;
    expect(route.request().headers()['authorization']).toBe('Bearer access-prueba');
    await responder(route, intentos);
  });
}

async function abrirNuevaCotizacion(page: Page) {
  await page.goto('/');
  await page.locator('#correo-login').fill('usuario@example.com');
  await page.locator('#clave-login').fill('ClaveDemo123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  // La bienvenida se abre en cada sesión y tapa el Home; se entra por su propio enlace.
  await page
    .getByRole('dialog', { name: 'Ya puedes cotizar tu seguro' })
    .getByRole('link', { name: 'Cotizar mi seguro' })
    .click();
  await expect(page).toHaveURL(/\/cuenta\/cotizaciones\/nueva$/);
  await expect(page.getByRole('heading', { name: 'Elige tu banco' })).toBeVisible();
}

async function buscarCredito(page: Page, banco: string) {
  await page.locator('#banco').selectOption(banco);
  await page.getByRole('button', { name: 'Buscar mi crédito' }).click();
}

test('consulta exitosa: muestra el crédito traído del banco, de solo lectura y con su origen', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCreditos(page, (route) =>
    route.fulfill({ json: respuestaCreditos('DISPONIBLE', [CREDITO_BANCOLOMBIA]) }),
  );
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');

  await expect(page.getByRole('heading', { name: 'Tu crédito hipotecario' })).toBeVisible();
  await expect(page.getByText('TRAÍDO DE BANCOLOMBIA · OPEN FINANCE')).toBeVisible();
  await expect(page.getByText('$ 250.000.000')).toBeVisible();
  await expect(page.getByText('$ 180.000.000')).toBeVisible();
  await expect(page.getByText('168 meses')).toBeVisible();
  await expect(page.locator('#entidad-verificada')).toHaveAttribute('readonly', '');

  await page.getByRole('button', { name: 'Ver mi cotización' }).click();
  await expect(page.getByText('Verificado con tu banco')).toBeVisible();
});

test('consulta exitosa: muestra la fecha de la consulta (BITS-219 AC-2)', async ({ page }) => {
  await simularSesion(page);
  await simularCreditos(page, (route) =>
    route.fulfill({ json: respuestaCreditos('DISPONIBLE', [CREDITO_BANCOLOMBIA]) }),
  );
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');

  await expect(page.getByRole('heading', { name: 'Tu crédito hipotecario' })).toBeVisible();
  // 14:30 UTC es 9:30 a. m. en Bogotá; la pantalla fija la zona horaria.
  await expect(page.getByText(/Fecha de consulta: 17 de octubre de 2026.*9:30/)).toBeVisible();
});

test('consulta que tarda: avisa que está buscando y no deja repetir la búsqueda', async ({
  page,
}) => {
  await simularSesion(page);
  let liberar!: () => void;
  const respuestaLista = new Promise<void>((resolver) => (liberar = resolver));
  await simularCreditos(page, async (route) => {
    await respuestaLista;
    await route.fulfill({ json: respuestaCreditos('DISPONIBLE', [CREDITO_BANCOLOMBIA]) });
  });
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');

  const modal = page.getByRole('dialog', { name: 'Estamos buscando tu crédito' });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Bancolombia');
  await expect(page.locator('#banco')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Buscar mi crédito' })).toBeDisabled();

  liberar();
  await expect(modal).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Tu crédito hipotecario' })).toBeVisible();
});

test('consulta que falla: conserva el banco y deja reintentar o cambiar de banco (BITS-219 AC-3)', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCreditos(page, (route, intento) =>
    intento === 1
      ? route.fulfill({ status: 503, json: { code: 'FUENTE_NO_DISPONIBLE' } })
      : route.fulfill({ json: respuestaCreditos('DISPONIBLE', [CREDITO_BANCOLOMBIA]) }),
  );
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');

  await expect(page.getByRole('status')).toContainText('No pudimos consultar el banco');
  await expect(page.locator('#entidad-manual')).toHaveValue('Bancolombia');

  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu crédito hipotecario' })).toBeVisible();
  await expect(page.getByText('TRAÍDO DE BANCOLOMBIA · OPEN FINANCE')).toBeVisible();
});

test('consulta que falla: cambiar de banco vuelve a la lista (BITS-219 AC-3)', async ({ page }) => {
  await simularSesion(page);
  await simularCreditos(page, (route) =>
    route.fulfill({ status: 503, json: { code: 'FUENTE_NO_DISPONIBLE' } }),
  );
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');
  await expect(page.locator('#entidad-manual')).toHaveValue('Bancolombia');

  await page.getByRole('button', { name: 'Cambiar de banco' }).click();
  await expect(page.getByRole('heading', { name: 'Elige tu banco' })).toBeVisible();
  await expect(page.locator('#banco')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Buscar mi crédito' })).toBeDisabled();
});

test('sin hipoteca en ese banco: pasa a captura manual con el banco fijado', async ({ page }) => {
  await simularSesion(page);
  await simularCreditos(page, (route) =>
    route.fulfill({ json: respuestaCreditos('SIN_HIPOTECAS') }),
  );
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Davivienda');

  await expect(
    page.getByRole('heading', { name: 'Escribe los datos de tu crédito' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No encontramos un crédito hipotecario');
  await expect(page.locator('#entidad-manual')).toHaveValue('Davivienda');
  await expect(page.locator('#entidad-manual')).toHaveAttribute('readonly', '');
});

test('sin autorización de Open Finance: no consulta el banco y pasa a captura manual', async ({
  page,
}) => {
  await simularSesion(page, []);
  let consultas = 0;
  await simularCreditos(page, async (route) => {
    consultas += 1;
    await route.fulfill({ json: respuestaCreditos('DISPONIBLE', [CREDITO_BANCOLOMBIA]) });
  });
  await abrirNuevaCotizacion(page);
  await buscarCredito(page, 'Bancolombia');

  await expect(
    page.getByRole('heading', { name: 'Escribe los datos de tu crédito' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No autorizaste la consulta');
  expect(consultas).toBe(0);
});

test('banco que no está en la lista: escribe la entidad y los datos, y quedan como declarados', async ({
  page,
}) => {
  await simularSesion(page);
  await abrirNuevaCotizacion(page);
  await page.locator('#banco').selectOption('__OTRO__');

  await expect(
    page.getByRole('heading', { name: 'Escribe los datos de tu crédito' }),
  ).toBeVisible();
  const entidad = page.locator('#entidad-manual');
  await expect(entidad).not.toHaveAttribute('readonly', '');
  await entidad.fill('Cooperativa Confiar');
  await page.locator('#valor-credito').fill('120000000');
  await page.locator('#saldo').fill('95000000');
  await page.locator('#plazo').fill('120');
  await page.getByRole('button', { name: 'Ver mi cotización' }).click();

  await expect(page.getByRole('heading', { name: 'Datos de tu crédito' })).toBeVisible();
  await expect(page.getByText('Cooperativa Confiar')).toBeVisible();
  await expect(page.getByText('Declarado por ti')).toBeVisible();
});

test('valores fuera de rango: se rechazan con su mensaje y no avanza', async ({ page }) => {
  await simularSesion(page);
  await abrirNuevaCotizacion(page);
  await page.locator('#banco').selectOption('__OTRO__');

  await page.locator('#entidad-manual').fill('X');
  await page.locator('#valor-credito').fill('9999999');
  await page.locator('#saldo').fill('0');
  await page.locator('#plazo').fill('481');
  await page.getByRole('button', { name: 'Ver mi cotización' }).click();

  const errores = page.getByRole('alert');
  await expect(errores).toContainText('Ingresa una entidad acreedora válida');
  await expect(errores).toContainText('al menos COP 10.000.000');
  await expect(errores).toContainText('saldo pendiente mayor a cero');
  await expect(errores).toContainText('entre 12 y 480 meses');
  await expect(
    page.getByRole('heading', { name: 'Escribe los datos de tu crédito' }),
  ).toBeVisible();

  await page.locator('#plazo').fill('11');
  await page.getByRole('button', { name: 'Ver mi cotización' }).click();
  await expect(errores).toContainText('entre 12 y 480 meses');
});
