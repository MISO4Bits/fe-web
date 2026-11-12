import { expect, test } from '@playwright/test';
import { entrar, simularSesion } from './apoyo/cotizacion';

const poliza = {
  polizaId: 'poliza-369',
  numero: 'POL-2026-000123',
  estado: 'EMITIDA',
  pendientes: [],
  moneda: 'COP',
  primaTotalMensual: 77374,
  emitidaEn: '2026-10-22T15:00:00Z',
  vigencia: { desde: '2025-12-17T05:00:00Z', hasta: '2026-12-17T05:00:00Z' },
  datosCredito: {
    entidadAcreedora: 'Bancolombia',
    valorCredito: 380000000,
    saldoInsoluto: 320000000,
    plazoRestanteMeses: 180,
  },
  coberturas: [
    {
      codigo: 'VIDA',
      obligatoria: true,
      sumaAsegurada: 320000000,
      primaNeta: 49100,
      iva: 0,
      primaTotal: 49100,
    },
    {
      codigo: 'HOGAR',
      obligatoria: false,
      sumaAsegurada: 380000000,
      primaNeta: 23760,
      iva: 4514,
      primaTotal: 28274,
    },
  ],
};

const siniestro = (
  id: string,
  polizaId: string,
  tipo: string,
  estado: string,
  reportadoEn: string,
  automatico = false,
) => ({
  id,
  numero: `SIN-2026-${id}`,
  polizaId,
  tipo,
  estado,
  reportadoEn,
  actualizadoEn: reportadoEn,
  automatico,
});

test('BITS-369 muestra los siniestros de cada cobertura y abre su detalle', async ({ page }) => {
  await simularSesion(page);
  await page.route('**/v1/cuenta/polizas', (route) => route.fulfill({ json: [poliza] }));
  await page.route('**/v1/cuenta/polizas/poliza-369', (route) => route.fulfill({ json: poliza }));
  await page.route('**/v1/cuenta/siniestros', (route) =>
    route.fulfill({
      json: [
        siniestro('00011', 'poliza-369', 'INCENDIO_TERREMOTO', 'RECHAZADO', '2026-08-02T10:00:00Z'),
        siniestro('otro', 'otra-poliza', 'INCAPACIDAD_TOTAL', 'PAGADO', '2026-12-01T10:00:00Z'),
        siniestro('00019', 'poliza-369', 'INCAPACIDAD_TOTAL', 'PAGADO', '2026-09-03T10:00:00Z'),
        siniestro(
          '00057',
          'poliza-369',
          'SISMO_PARAMETRICO',
          'PAGADO',
          '2026-11-02T10:00:00Z',
          true,
        ),
        siniestro(
          '00031',
          'poliza-369',
          'INCENDIO_TERREMOTO',
          'FALTA_INFORMACION',
          '2026-10-20T10:00:00Z',
        ),
      ],
    }),
  );
  await page.route('**/v1/cuenta/siniestros/00031', (route) =>
    route.fulfill({
      json: {
        ...siniestro(
          '00031',
          'poliza-369',
          'INCENDIO_TERREMOTO',
          'FALTA_INFORMACION',
          '2026-10-20T10:00:00Z',
        ),
        fechaOcurrencia: '2026-10-19',
        ultimaEntregaEn: '2026-10-20T10:00:00Z',
        evidenciaPedida: {
          detalle: 'Una foto de la fachada de tu casa donde se vea el número',
          pedidaEn: '2026-10-28T10:00:00Z',
        },
        archivos: [],
      },
    }),
  );

  await entrar(page);
  await page.getByRole('link', { name: 'Ver seguro POL-2026-000123' }).click();
  await expect(page).toHaveURL(/\/cuenta\/seguros\/poliza-369$/);
  await expect(page.getByRole('heading', { name: 'Vida para tu crédito y Tu casa' })).toBeVisible();

  const seccion = page.getByRole('region', { name: 'Siniestros de este seguro' });
  await expect(seccion.locator('.lista-siniestros a')).toHaveCount(4);
  await expect(seccion.locator('#siniestros-vida')).toHaveText('VIDA PARA TU CRÉDITO');
  await expect(seccion.locator('#siniestros-hogar')).toHaveText('TU CASA');
  await expect(seccion.locator('#siniestros-hogar + .tabla-siniestros a')).toHaveCount(3);
  await expect(seccion.locator('#siniestros-hogar + .tabla-siniestros a').first()).toContainText(
    'Automático',
  );
  await expect(seccion).not.toContainText('SIN-2026-otro');
  await page.screenshot({ path: 'test-results/bits369-w01.png', fullPage: true });
  await seccion.getByRole('link', { name: /SIN-2026-00031/ }).click();
  await expect(page).toHaveURL(/\/cuenta\/siniestros\/00031$/);
  await expect(page.getByRole('heading', { name: 'Siniestro SIN-2026-00031' })).toBeInViewport();
});
