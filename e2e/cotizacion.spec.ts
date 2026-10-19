import { test, expect } from '@playwright/test';
import {
  CREDITO_FIGMA,
  SIN_CONSENTIMIENTO_OPEN_FINANCE,
  abrirNuevaCotizacion,
  abrirPorQueEstePrecio,
  botonPorQueEstePrecio,
  cerrarBienvenida,
  cotizacion,
  cotizarConDatosDeclarados,
  cotizarConDatosDelBanco,
  datosDelCredito,
  entrar,
  esperarCotizacion,
  pesos,
  simularCotizacionActiva,
  simularCrearCotizacion,
  simularCreditoDelBanco,
  simularSesion,
  tarjetaCotizacionEnCurso,
} from './apoyo/cotizacion';

// BITS-145: recorrido web del Sprint 1, tramo de cotización (BITS-95).
// Escenario principal del journey crítico: cotizar con los datos traídos del banco.
// El escenario negativo (la consulta del crédito que falla) está en credito.spec.ts.
// Sin perfil, svc-cotizacion responde personalizado: false y fuentesNoDisponibles ["perfilamiento"],
// con o sin consentimiento: así se simula aquí.

const FACTORES = [
  {
    descripcion: 'Llevas años cumpliendo con tus créditos',
    efecto: 'POSITIVO' as const,
    pesoRelativo: 0.6,
  },
  {
    descripcion: 'Usas más del 70 % de tus cupos de tarjeta',
    efecto: 'NEGATIVO' as const,
    pesoRelativo: 0.4,
  },
];

const SIN_PERFIL = { fuentesNoDisponibles: ['perfilamiento'] };

test('sin cotizaciones, el Home ofrece cotizar y el registro no crea ninguna (AC-1)', async ({
  page,
}) => {
  await simularSesion(page);
  const enviadas = await simularCrearCotizacion(page, cotizacion());

  await entrar(page);
  await cerrarBienvenida(page);

  await expect(
    page.getByRole('heading', { name: 'Todavía no tienes seguros', exact: true }),
  ).toBeVisible();
  const misSeguros = page.getByRole('region', { name: 'Mis seguros' });
  await expect(misSeguros).toContainText('Todavía no tienes seguros ni cotizaciones');
  await expect(misSeguros.getByRole('link', { name: 'Cotizar mi seguro' })).toBeVisible();
  expect(enviadas).toHaveLength(0);
});

test('cotiza con los datos del banco: solo manda el crédito y los muestra con la prima (AC-2)', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCreditoDelBanco(page);
  const enviadas = await simularCrearCotizacion(page, cotizacion({ factores: FACTORES }));

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);

  expect(enviadas).toHaveLength(1);
  // Ni cuestionario ni edad: la edad la deriva el BFF de la sesión.
  expect(enviadas[0].postDataJSON()).toEqual({ datosCredito: CREDITO_FIGMA });
  await expect(page.locator('.precio')).toContainText(pesos(49100));
  const datos = datosDelCredito(page);
  await expect(datos).toContainText('Bancolombia');
  await expect(datos).toContainText(pesos(320000000));
  await expect(datos).toContainText('180 meses');
  await expect(page.getByText('Cuánto cubrimos hoy')).toBeVisible();
});

test('con perfil, la cotización es personalizada y explica el precio con sus factores (AC-3)', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCreditoDelBanco(page);
  await simularCrearCotizacion(page, cotizacion({ factores: FACTORES }));

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);
  await expect(page.locator('.precio')).toContainText(pesos(49100));
  const modal = await abrirPorQueEstePrecio(page);

  await expect(modal).toContainText('TU PRECIO PERSONALIZADO');
  await expect(modal).toContainText(pesos(49100));
  await expect(modal).toContainText('Llevas años cumpliendo con tus créditos');
  await expect(modal).toContainText('Usas más del 70 % de tus cupos de tarjeta');
  await expect(modal).toContainText('No miramos tus saldos ni tus deudas exactas');
});

// En web, un perfil sin factores no ofrece "¿Por qué este precio?" (decisión de cierre del
// Sprint 1). Móvil sí muestra la explicación del 04L.
test('con perfil neutro, cobra la tarifa estándar sin ofrecer la explicación del precio (AC-3)', async ({
  page,
}) => {
  const neutra = cotizacion({ factores: [], primaMensual: 54600 });
  await simularSesion(page);
  await simularCreditoDelBanco(page);
  await simularCrearCotizacion(page, neutra);

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);

  await expect(page.locator('.precio')).toContainText(pesos(54600));
  await expect(botonPorQueEstePrecio(page)).toHaveCount(0);
});

test('sin autorización financiera, usa la tarifa estándar sin hablar del perfil (AC-4)', async ({
  page,
}) => {
  await simularSesion(page, SIN_CONSENTIMIENTO_OPEN_FINANCE);
  await simularCrearCotizacion(page, cotizacion(SIN_PERFIL));

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDeclarados(page, CREDITO_FIGMA);

  await expect(page.locator('.precio')).toContainText(pesos(54600));
  await expect(page.getByText('Esta cotización usa la tarifa estándar')).toBeVisible();
  await expect(page.getByText('Para continuar necesitamos tu autorización')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a mis seguros' })).toBeVisible();
  await expect(page.getByText(/analizando tu perfil/i)).toHaveCount(0);
  await expect(page.getByText(/perfil está en análisis/i)).toHaveCount(0);
  await expect(botonPorQueEstePrecio(page)).toHaveCount(0);
});

test('sin perfil calculado, usa la tarifa estándar y no la presenta como personalizada (AC-4)', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCreditoDelBanco(page);
  await simularCrearCotizacion(page, cotizacion(SIN_PERFIL));

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);

  await expect(page.locator('.precio')).toContainText(pesos(54600));
  await expect(botonPorQueEstePrecio(page)).toHaveCount(0);
});

test('con datos declarados, advierte que la cotización no está verificada (AC-5)', async ({
  page,
}) => {
  const declarada = cotizacion({
    datos: { ...CREDITO_FIGMA, entidadAcreedora: 'Cooperativa Confiar' },
    factores: FACTORES,
  });
  await simularSesion(page);
  await simularCrearCotizacion(page, declarada);

  await abrirNuevaCotizacion(page);
  await cotizarConDatosDeclarados(page, {
    ...CREDITO_FIGMA,
    entidadAcreedora: 'Cooperativa Confiar',
  });

  await expect(
    page.getByText('Lo calculamos con los datos de crédito que tú declaraste', { exact: false }),
  ).toBeVisible();
});

test('con una cotización en curso, el Home la muestra y se retoma sin repetir el proceso (AC-6)', async ({
  page,
}) => {
  await simularSesion(page);
  await simularCotizacionActiva(page, cotizacion({ factores: FACTORES }));
  const enviadas = await simularCrearCotizacion(page, cotizacion());

  await entrar(page);

  await expect(page.getByRole('heading', { name: 'Tienes una cotización en curso' })).toBeVisible();
  // Con una cotización vigente, la bienvenida no ofrece cotizar de nuevo.
  await expect(page.getByRole('dialog', { name: 'Ya puedes cotizar tu seguro' })).toHaveCount(0);
  const tarjeta = tarjetaCotizacionEnCurso(page);
  await expect(tarjeta).toContainText('Crédito con Bancolombia');
  await expect(tarjeta).toContainText(pesos(49100));

  await tarjeta.click();
  await esperarCotizacion(page);
  await expect(page.locator('.precio')).toContainText(pesos(49100));
  expect(enviadas).toHaveLength(0);
});
