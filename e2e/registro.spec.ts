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
    } else if (url.pathname.endsWith('/confirmacion')) {
      expect(req.headers()['authorization']).toBeUndefined();
      const token = req.postDataJSON().oobCode;
      if (token !== 'demo-valid') {
        await route.fulfill({
          status: token === 'expired-code' ? 422 : 400,
          json: { code: token === 'expired-code' ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN' },
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

test('inicio → registro → aviso de correo sin acceso al Home', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
  await expect(page.getByRole('heading', { name: 'Confirma tu correo' })).toBeVisible();
  await expect(page.locator('.email').filter({ hasText: 'martin@example.com' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a mi cuenta' })).toHaveCount(0);
  await page.goto('/cuenta');
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await expect(page.getByRole('button', { name: 'Crear mi cuenta', exact: true })).toBeVisible();
});

test('registro con permiso financiero y confirmación sin bloquear acceso', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page);
  await page.getByLabel('Autorizo consultar').check();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
  await expect(page.getByRole('button', { name: 'Reenviarme el correo' })).toHaveCount(0);
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
  await page.goto('/verificar-correo?oobCode=demo-valid');
  await expect(page.getByRole('heading', { name: 'Listo, confirmamos tu correo.' })).toBeVisible();
  await expect(page).toHaveURL(/\/verificar-correo$/);
  await expect(page.getByText('martin@example.com', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: /entrar|iniciar sesión/i })).toHaveCount(0);
  await page.goto('/verificar-correo?oobCode=expired-code');
  await expect(
    page.getByRole('heading', { name: 'Este enlace ya se usó o venció.' }),
  ).toBeVisible();
  await page.goto('/verificar-correo?oobCode=incorrect-code');
  await expect(page.getByRole('heading', { name: 'Enlace inválido' })).toBeVisible();
});

test('sin código no confirma; fallo temporal permite reintentar sin exponer el código', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/v1/registro/confirmacion', async (route) => {
    calls++;
    expect(new URL(page.url()).searchParams.has('oobCode')).toBe(false);
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ oobCode: 'retry-code-123' });
    await route.fulfill(
      calls === 1
        ? { status: 503, json: { detail: 'privado' } }
        : { json: { email: 'otro@example.com', correoConfirmado: true } },
    );
  });
  for (const suffix of ['', '?oobCode=short', '?oobCode=one-code-123&oobCode=two-code-123']) {
    await page.goto('/verificar-correo' + suffix);
    await expect(page.getByRole('heading', { name: 'Enlace inválido' })).toBeVisible();
  }
  expect(calls).toBe(0);
  await page.goto('/verificar-correo?oobCode=retry-code-123');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByText('privado')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Listo, confirmamos tu correo.' })).toBeVisible();
  expect(calls).toBe(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Enlace inválido' })).toBeVisible();
  expect(calls).toBe(2);
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

test('inicio y logo abren registro sin pantallas antiguas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await expect(page.locator('#email')).toHaveValue('');
  await page.goto('/confirmar-correo');
  await page.getByRole('link', { name: 'Solventa', exact: true }).click();
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  for (const url of ['/ingreso', '/precotizacion/resultado', '/home']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/crear-cuenta$/);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBeTruthy();
  expect(errors).toEqual([]);
});

test('solo términos es obligatorio y ambos permisos adicionales son opcionales', async ({
  page,
}) => {
  await page.goto('/crear-cuenta');
  await fillRegistration(page);
  await page.getByLabel('Autorizo el tratamiento de mis datos personales.').uncheck();
  await page.getByLabel('Acepto los términos').uncheck();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page.getByText('Este permiso es necesario para crear la cuenta.')).toBeVisible();
  await page.getByLabel('Acepto los términos').check();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/v1/registro') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  const body = (await response).request().postDataJSON();
  expect(body.autorizaTratamientoDatos).toBe(false);
  expect(body.autorizaDatosFinancieros).toBe(false);
  expect(body.politicaVersionTratamientoDatos).toBeNull();
  expect(body.politicaVersionDatosFinancieros).toBeNull();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
});

test('fallo de disponibilidad no desplaza campos ni impide registrar', async ({ page }) => {
  await page.route('**/v1/registro/disponibilidad?**', (route) =>
    route.fulfill({ status: 503, json: { title: 'Unavailable' } }),
  );
  await page.goto('/crear-cuenta');
  const before = await page.locator('#birthDate').boundingBox();
  await fillRegistration(page);
  await expect(page.locator('#documentNumber-availability')).toBeVisible();
  await expect(page.locator('#email-availability')).toBeVisible();
  expect((await page.locator('#birthDate').boundingBox())?.y).toBe(before?.y);
  await expect(page.getByText('Comprobando disponibilidad…')).toHaveCount(0);
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-correo$/);
});

test('documentos no disponibles bloquean permisos sin botón de reintento', async ({ page }) => {
  await page.route('**/v1/documentos-legales?**', (route) =>
    route.fulfill({ status: 503, json: { title: 'Unavailable' } }),
  );
  await page.goto('/crear-cuenta');
  await expect(page.getByText('Documento no disponible.', { exact: true })).toHaveCount(3);
  for (const checkbox of await page.locator('input[type=checkbox]').all()) {
    await expect(checkbox).toBeDisabled();
    await expect(checkbox).not.toBeChecked();
  }
  await expect(page.getByRole('button', { name: 'Reintentar documentos' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear mi cuenta', exact: true })).toBeDisabled();
});
