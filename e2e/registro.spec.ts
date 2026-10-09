import { test, expect, Page } from '@playwright/test';

// Respuestas HTTP controladas para pruebas; la aplicación utiliza el adaptador real.
test.beforeEach(async ({ page }) => {
  await page.route('**/v1/documentos-legales?**', (route) =>
    route.fulfill({
      json: [
        {
          tipo: 'terminos',
          version: 'V1',
          titulo: 'Términos y condiciones',
          baseLegal: 'Ley 527',
          contenido: '<h3>Términos del BFF</h3><p>Texto servido por el BFF.</p>',
        },
        {
          tipo: 'open-data',
          version: 'V2',
          titulo: 'Tratamiento de datos personales',
          baseLegal: 'Ley 1581',
          contenido: '<p>Tratamiento de datos.</p>',
        },
        {
          tipo: 'open-finance',
          version: 'V3',
          titulo: 'Consulta en centrales de riesgo',
          baseLegal: 'Ley 1266',
          contenido: '<p>Consulta financiera.</p>',
        },
      ],
    }),
  );
  await page.route('**/v1/registro**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith('/disponibilidad')) {
      await route.fulfill({
        json: {
          correoDisponible: url.searchParams.get('correo') !== 'sofia.pedraza@correo.com',
          documentoDisponible: url.searchParams.get('numeroDocumento') !== '1018456723',
        },
      });
    } else if (url.pathname.endsWith('/reenvio-confirmacion')) {
      expect(req.headers()['authorization']).toBe('Bearer test-access');
      await route.fulfill({ status: 204 });
    } else if (url.pathname.endsWith('/confirmacion')) {
      const token = req.headers()['authorization'];
      if (token !== 'Bearer demo-valid') {
        await route.fulfill({
          status: 410,
          json: { code: token === 'Bearer expired' ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN' },
        });
      } else {
        await route.fulfill({
          json: {
            clienteId: 'test',
            email: 'martin@example.com',
            primerNombre: 'Martín',
            primerApellido: 'Flores',
            estado: 'ACTIVO',
            correoConfirmado: true,
          },
        });
      }
    } else {
      const body = req.postDataJSON();
      expect(body.reference).toBeUndefined();
      expect(body.identity).toBeUndefined();
      expect(body.fechaNacimiento).toBe('1985-08-02');
      if (body.email.endsWith('@mailinator.com')) {
        await route.fulfill({ status: 422, json: { code: 'DISPOSABLE_EMAIL' } });
      } else if (body.email === 'error@solventa.test') {
        await route.fulfill({ status: 503, json: {} });
      } else {
        await route.fulfill({
          status: 201,
          json: {
            cuenta: {
              clienteId: 'test',
              email: body.email,
              primerNombre: body.primerNombre,
              primerApellido: body.primerApellido,
              estado: 'ACTIVO',
              correoConfirmado: false,
            },
            sesion: { accessToken: 'test-access', refreshToken: 'test-refresh', expiresIn: 3600 },
          },
        });
      }
    }
  });
});

async function fillRegistration(page: Page, email = 'martin@example.com', document = '123456789') {
  await page.getByLabel('Nombres', { exact: true }).fill('Martín');
  await page.getByLabel('Apellidos', { exact: true }).fill('Flores');
  await page.getByLabel('Número de documento', { exact: true }).fill(document);
  await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('02/08/1985');
  await page.getByLabel('Celular').fill('3001234567');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('ClaveDemo123');
  await page.getByLabel('Acepto los términos').check();
  await page.getByLabel('Autorizo el tratamiento').check();
}

test('02 → registro → Home sin cotizaciones; consulta financiera opcional', async ({ page }) => {
  await page.goto('/precotizacion/resultado');
  await expect(page.getByRole('heading', { name: 'Un seguro para ti desde' })).toBeVisible();
  await expect(page.getByText('$57.100', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Crear mi cuenta', exact: true }).click();
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
  await expect(page.getByRole('heading', { name: 'Confirma tu correo' })).toBeVisible();
  await expect(page.getByText('martin@example.com', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ir a mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole('heading', { name: 'Todavía no tienes seguros ni cotizaciones' }),
  ).toBeVisible();
  await expect(
    page.getByText('Puedes cotizar sin autorizar la consulta financiera.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cotizar mi seguro' })).toBeEnabled();
});

test('registro con permiso financiero y confirmación sin bloquear acceso', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page);
  await page.getByLabel('Autorizo consultar').check();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
  await page.getByRole('link', { name: 'Ir a mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByText('Puedes cotizar sin autorizar')).toHaveCount(0);
  await page.getByRole('link', { name: 'Ver información del correo' }).click();
  await page.getByRole('button', { name: 'Reenviarme el correo' }).click();
  await expect(page.getByRole('status')).toContainText('Solicitud recibida');
});

test('correo duplicado resalta el campo y conserva datos', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page, 'sofia.pedraza@correo.com');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.locator('#email-error')).toContainText('Ya tienes una cuenta con este correo');
  await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Nombres', { exact: true })).toHaveValue('Martín');
  await page.getByLabel('Correo electrónico').fill('otro@example.com');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
});

test('documento duplicado, correo desechable y falla de servicio', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page, 'martin@example.com', '1018456723');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.locator('#documentNumber-error')).toContainText('número de documento');
  await page.getByLabel('Número de documento', { exact: true }).fill('987654321');
  await page.getByLabel('Correo electrónico').fill('test@mailinator.com');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('correo permanente');
  await page.getByLabel('Correo electrónico').fill('error@solventa.test');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No pudimos crear');
  await expect(page.getByLabel('Nombres', { exact: true })).toHaveValue('Martín');
});

test('validaciones y permisos obligatorios; modal con teclado', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa los campos');
  await page.getByRole('button', { name: 'Ver el aviso de tratamiento de datos' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Ver el aviso de tratamiento de datos' }).click();
  await page.getByRole('button', { name: 'Autorizo el tratamiento', exact: true }).click();
  await expect(page.getByLabel('Autorizo el tratamiento de mis datos personales.')).toBeChecked();
});

test('enlace válido, expirado y manipulado', async ({ page }) => {
  await page.goto('/confirmar-correo?token=demo-valid');
  await expect(page.getByRole('heading', { name: 'Correo confirmado' })).toBeVisible();
  await page.goto('/confirmar-correo?token=expired');
  await expect(page.getByRole('status')).toContainText('El enlace expiró');
  await page.goto('/confirmar-correo?token=incorrect');
  await expect(page.getByRole('status')).toContainText('No pudimos validar');
});

test('sin desbordamiento horizontal en móvil y recursos originales cargados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/crear-cuenta']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
  await page.getByLabel('Acepto los términos').check();
  await expect(page.locator('.checkmark img').first()).toBeVisible();
  expect(
    await page
      .locator('.checkmark img')
      .first()
      .evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
});

test('campos vacíos sin ejemplos y tipos de documento con nombre completo', async ({ page }) => {
  await page.goto('/crear-cuenta');
  for (const id of [
    'firstName',
    'lastName',
    'documentNumber',
    'birthDate',
    'phone',
    'email',
    'password',
  ]) {
    await expect(page.locator('#' + id)).toHaveValue('');
    await expect(page.locator('#' + id)).not.toHaveAttribute('placeholder');
  }
  await expect(page.locator('#documentType option')).toHaveText([
    'Cédula de ciudadanía',
    'Cédula de extranjería',
    'Pasaporte',
  ]);
});

test('máscara visual de cédula, envío sin puntos y límites según tipo', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page);
  await expect(page.locator('#documentNumber')).toHaveValue('123.456.789');
  await page.locator('#documentNumber').fill('1.018.456.723XYZ');
  await expect(page.locator('#documentNumber')).toHaveValue('1.018.456.723');
  await page.locator('#documentType').selectOption('PA');
  await expect(page.locator('#documentNumber')).toHaveValue('');
  await page.locator('#documentNumber').fill('AB.123-%_456789012345678');
  await expect(page.locator('#documentNumber')).toHaveValue('AB12345678901234');
  await page.locator('#documentType').selectOption('CC');
  await page.locator('#documentNumber').fill('123456789');
  const outgoing = page.waitForRequest(
    (r) => new URL(r.url()).pathname.endsWith('/v1/registro') && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  expect((await outgoing).postDataJSON().numeroDocumento).toBe('123456789');
  await expect(page).toHaveURL(/\/confirmar-correo$/);
});

test('celular solo dígitos, calendario y fecha digitada', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await page.locator('#phone').fill('12ab34%56');
  await expect(page.locator('#phone')).toHaveValue('123456');
  await page.locator('#phone').fill('123456789012345');
  await expect(page.locator('#phone')).toHaveValue('123456789012');
  await page.getByRole('button', { name: 'Abrir calendario de fecha de nacimiento' }).click();
  await page.keyboard.press('Escape');
  await page.locator('input[type=date]').fill('1985-08-02');
  await expect(page.locator('#birthDate')).toHaveValue('02/08/1985');
  await page.locator('#birthDate').fill('03/08/1985');
  await expect(page.locator('#birthDate')).toHaveValue('03/08/1985');
});

test('inicio en cuenta, enlace visible y logo vuelve al inicio', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole('heading', { name: 'Entra a tu cuenta' })).toBeVisible();
  const create = page.getByRole('link', { name: 'Crear mi cuenta', exact: true });
  await expect(create).toBeVisible();
  expect(await create.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  await create.click();
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await page.getByRole('link', { name: 'Solventa', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
});

test('documentos del BFF en el modal y versiones enviadas en el registro', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await page.getByRole('button', { name: 'Ver los términos y condiciones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Términos del BFF' })).toBeVisible();
  await page.getByRole('button', { name: 'Entendido, acepto' }).click();
  await fillRegistration(page);
  await page.getByLabel('Autorizo consultar').check();
  const sent = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/v1/registro'),
  );
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  const body = (await sent).postDataJSON();
  expect(body.politicaVersion).toBe('V1');
  expect(body.politicaVersionTratamientoDatos).toBe('V2');
  expect(body.politicaVersionDatosFinancieros).toBe('V3');
  await expect(page).toHaveURL(/\/confirmar-correo$/);
});
test('fallo de documentos bloquea crear cuenta y permite reintentar', async ({ page }) => {
  let failed = true;
  await page.route('**/v1/documentos-legales?**', async (route) => {
    if (failed) await route.fulfill({ status: 503, json: {} });
    else await route.fallback();
  });
  await page.goto('/crear-cuenta');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar');
  await expect(page.getByRole('button', { name: 'Crear mi cuenta', exact: true })).toBeDisabled();
  failed = false;
  await page.getByRole('button', { name: 'Reintentar documentos' }).click();
  await expect(page.getByRole('button', { name: 'Crear mi cuenta', exact: true })).toBeEnabled();
});
