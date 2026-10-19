import { test, expect, Page } from '@playwright/test';
import {
  CREDITO_FIGMA,
  abrirNuevaCotizacion,
  controlTuCasa,
  cotizacion,
  cotizarConDatosDelBanco,
  pesos,
  resumenMensual,
  simularCrearCotizacion,
  simularCreditoDelBanco,
  simularSesion,
} from './apoyo/cotizacion';

// BITS-96 (CP-W de BITS-294): "Tu casa" opcional con el precio desglosado.
// Montos de oferta.desglose.coberturas, calculados como svc-cotizacion. Con el crédito de Figma
// ($320.000.000): vida $49.100, casa $23.760 + IVA $4.514 = $28.274, total $77.374.
// En web, solo con vida el desglose no muestra la línea de IVA: la vida no lleva IVA.

const CREDITO_BAJO_EL_TOPE = {
  valorCredito: 150000000,
  plazoRestanteMeses: 228,
  entidadAcreedora: 'Bancolombia',
  saldoInsoluto: 142000000,
};

async function cotizar(page: Page, datos = CREDITO_FIGMA, primaVida = 49100) {
  await simularSesion(page);
  await simularCreditoDelBanco(page, datos);
  await simularCrearCotizacion(
    page,
    cotizacion({ datos, factores: [], primaMensual: primaVida, primaBaseMensual: primaVida }),
  );
  await abrirNuevaCotizacion(page);
  await cotizarConDatosDelBanco(page);
}

test('vida va siempre y "Tu casa" se ofrece sin marcar, con su precio y su tope (AC-1)', async ({
  page,
}) => {
  await cotizar(page);

  await expect(page.getByText('Va siempre')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vida para tu crédito' })).toBeVisible();
  await expect(controlTuCasa(page)).not.toBeChecked();
  await expect(page.getByText(/\+\s?\$\s?28\.274\s?\/\s?mes/)).toBeVisible();
  await expect(page.getByText(/Cubrimos hasta \$\s?240\.000\.000/)).toBeVisible();
});

test('con un crédito bajo el tope, "Tu casa" cubre el valor del crédito (AC-1)', async ({
  page,
}) => {
  await cotizar(page, CREDITO_BAJO_EL_TOPE, 27832);

  await expect(page.getByText(/Cubrimos hasta \$\s?150\.000\.000/)).toBeVisible();
  await expect(page.getByText(/\+\s?\$\s?17\.672\s?\/\s?mes/)).toBeVisible();
});

test('marcar y desmarcar "Tu casa" cambia el total al instante, sin llamar al servidor (AC-2)', async ({
  page,
}) => {
  await cotizar(page);
  let llamadas = 0;
  page.on('request', (r) => {
    if (r.url().includes('/v1/cotizaciones')) llamadas += 1;
  });
  const resumen = resumenMensual(page);

  await expect(resumen).toContainText(pesos(49100));
  await controlTuCasa(page).check();
  await expect(resumen).toContainText(pesos(77374));
  await controlTuCasa(page).uncheck();
  await expect(resumen).not.toContainText(pesos(77374));
  await expect(resumen).toContainText(pesos(49100));
  expect(llamadas).toBe(0);
});

test('el desglose separa vida, "Tu casa", IVA y total, cada uno por mes (AC-3)', async ({
  page,
}) => {
  await cotizar(page);
  const resumen = resumenMensual(page);

  await controlTuCasa(page).check();
  await expect(resumen).toContainText(/\$\s?49\.100\s?\/\s?mes/);
  await expect(resumen).toContainText(/\$\s?23\.760\s?\/\s?mes/);
  await expect(resumen).toContainText('IVA');
  await expect(resumen).toContainText(/\$\s?4\.514\s?\/\s?mes/);
  await expect(resumen).toContainText(pesos(77374));
});

test('solo con vida, el total es la prima de vida y no hay IVA (AC-3)', async ({ page }) => {
  await cotizar(page);
  const resumen = resumenMensual(page);

  await expect(controlTuCasa(page)).not.toBeChecked();
  await expect(resumen).toContainText(/\$\s?49\.100\s?\/\s?mes/);
  await expect(resumen).toContainText(pesos(49100));
  await expect(resumen).not.toContainText('IVA');
  await expect(resumen).not.toContainText(/\$\s?4\.514/);
});
