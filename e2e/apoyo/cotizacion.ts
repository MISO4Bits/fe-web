import { expect, Page, Request } from '@playwright/test';

// Apoyo de los E2E de cotización (BITS-145, BITS-95) y de "Tu casa" (BITS-96).
// El BFF se simula con page.route; la forma de las respuestas sale de openapi.yaml de bff-web
// (Cotizacion, Oferta, Desglose, CoberturaPrecio). Cada prueba arma sus propias rutas: nada se
// comparte entre pruebas.
//
// Las funciones marcadas "PANTALLA" dependen de cómo quede "Tu casa" (BITS-294), que todavía no
// está en develop. Si cambia la pantalla, se ajustan ahí y no en cada prueba.

export const CONSENTIMIENTO_OPEN_FINANCE = [
  { scope: 'OPEN_FINANCE', estado: 'OTORGADO', vigente: true },
];

// Registro sin autorizar datos financieros: svc-core guarda OPEN_FINANCE como NO_OTORGADO.
export const SIN_CONSENTIMIENTO_OPEN_FINANCE = [
  { scope: 'OPEN_FINANCE', estado: 'NO_OTORGADO', vigente: false },
];

export interface DatosCredito {
  valorCredito: number;
  plazoRestanteMeses: number;
  entidadAcreedora: string;
  saldoInsoluto: number;
}

export interface Cobertura {
  codigo: 'VIDA' | 'HOGAR';
  obligatoria: boolean;
  sumaAsegurada: number;
  primaNeta: number;
  iva: number;
  primaTotal: number;
}

export interface Factor {
  descripcion: string;
  efecto: 'POSITIVO' | 'NEGATIVO';
  pesoRelativo?: number | null;
}

// Crédito de las pantallas de Figma W2 (04 · Cotización · mensual): Bancolombia, $320.000.000.
export const CREDITO_FIGMA: DatosCredito = {
  valorCredito: 320000000,
  plazoRestanteMeses: 180,
  entidadAcreedora: 'Bancolombia',
  saldoInsoluto: 320000000,
};

// "Tu casa" según BITS-96: min(240.000.000, valor) × 0,099 ÷ 1.000, más 19 % de IVA.
export function hogar(valorCredito: number): Cobertura {
  const sumaAsegurada = Math.min(240000000, valorCredito);
  // En enteros, para que $2.821,5 redondee a $2.822 como en svc-cotizacion (ROUND_HALF_UP).
  const primaNeta = Math.round((sumaAsegurada * 99) / 1_000_000);
  const iva = Math.round((primaNeta * 19) / 100);
  return {
    codigo: 'HOGAR',
    obligatoria: false,
    sumaAsegurada,
    primaNeta,
    iva,
    primaTotal: primaNeta + iva,
  };
}

export function vida(primaMensual: number, saldoInsoluto: number): Cobertura {
  return {
    codigo: 'VIDA',
    obligatoria: true,
    sumaAsegurada: saldoInsoluto,
    primaNeta: primaMensual,
    iva: 0,
    primaTotal: primaMensual,
  };
}

interface OpcionesCotizacion {
  datos?: DatosCredito;
  primaMensual?: number;
  primaBaseMensual?: number;
  factores?: Factor[] | null;
  fuentesNoDisponibles?: string[];
}

// Cotización del BFF. Con `factores` es personalizada; con `factores: null` es tarifa estándar.
export function cotizacion({
  datos = CREDITO_FIGMA,
  primaMensual = 49100,
  primaBaseMensual = 54600,
  factores = null,
  fuentesNoDisponibles = [],
}: OpcionesCotizacion = {}) {
  const personalizado = factores !== null;
  const prima = personalizado ? primaMensual : primaBaseMensual;
  return {
    estado: 'VIGENTE',
    producto: 'VIDA_HIPOTECARIO',
    datosCredito: datos,
    origenDatos: 'DECLARADO',
    oferta: {
      primaMensual: prima,
      primaBaseMensual,
      sumaAsegurada: datos.saldoInsoluto,
      coberturaMeses: datos.plazoRestanteMeses,
      moneda: 'COP',
      personalizado,
      fuentesNoDisponibles,
      desglose: {
        coberturas: [vida(prima, datos.saldoInsoluto), hogar(datos.valorCredito)],
      },
    },
    perfilRiesgo: personalizado ? { nivelRiesgo: 'BAJO', factores } : null,
    vigenciaCotizacion: { desde: '2026-10-18T14:35:00Z', hasta: '2026-11-17T14:35:00Z' },
    creadaEn: '2026-10-18T14:35:00Z',
  };
}

// Pesos como los muestra la pantalla: "$49.100" o "$ 49.100".
export function pesos(valor: number): RegExp {
  const cifra = valor.toLocaleString('es-CO', { maximumFractionDigits: 0 }).replace(/\./g, '\\.');
  return new RegExp(`\\$\\s?${cifra}(?!\\d)`);
}

export async function simularSesion(
  page: Page,
  consentimientos: object[] = CONSENTIMIENTO_OPEN_FINANCE,
) {
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
  // Cliente sin cotización: el Home muestra la bienvenida.
  await simularCotizacionActiva(page, null);
}

// La cotización activa del cliente. `null` responde 404: no tiene cotización.
export async function simularCotizacionActiva(page: Page, activa: object | null) {
  await page.route('**/v1/cotizaciones/actual', (route) =>
    activa === null
      ? route.fulfill({ status: 404, json: { code: 'NO_ENCONTRADO' } })
      : route.fulfill({ json: activa }),
  );
}

// Responde el POST de cotización y guarda lo que mandó el navegador. Desde ese momento la
// cotización creada es la activa, como en el BFF.
export async function simularCrearCotizacion(page: Page, respuesta: object) {
  const enviadas: Request[] = [];
  await page.route('**/v1/cotizaciones', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    enviadas.push(route.request());
    expect(route.request().headers()['authorization']).toBe('Bearer access-prueba');
    await simularCotizacionActiva(page, respuesta);
    return route.fulfill({ status: 201, json: respuesta });
  });
  return enviadas;
}

export async function simularCreditoDelBanco(page: Page, datos: DatosCredito = CREDITO_FIGMA) {
  await page.route('**/v1/creditos-hipotecarios**', (route) =>
    route.fulfill({
      json: {
        estado: 'DISPONIBLE',
        creditos: [
          {
            entidadId: 'bancolombia',
            entidadNombre: datos.entidadAcreedora,
            valorCredito: datos.valorCredito,
            saldoInsoluto: datos.saldoInsoluto,
            plazoRestanteMeses: datos.plazoRestanteMeses,
            cuotaMensual: 2100000,
          },
        ],
        entidades: [
          { id: 'bancolombia', nombre: 'Bancolombia' },
          { id: 'davivienda', nombre: 'Davivienda' },
        ],
        origen: 'OPEN_FINANCE',
        fechaConsulta: '2026-10-18T14:30:00Z',
      },
    }),
  );
}

// La bienvenida se abre en cada sesión y tapa el Home.
const BIENVENIDA = 'Ya puedes cotizar tu seguro';

export async function entrar(page: Page) {
  await page.goto('/');
  await page.locator('#correo-login').fill('usuario@example.com');
  await page.locator('#clave-login').fill('ClaveDemo123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
}

export async function cerrarBienvenida(page: Page) {
  const dialogo = page.getByRole('dialog', { name: BIENVENIDA });
  await dialogo.getByRole('button', { name: 'Cerrar ventana' }).click();
  await expect(dialogo).toBeHidden();
}

export async function abrirNuevaCotizacion(page: Page) {
  await entrar(page);
  await page
    .getByRole('dialog', { name: BIENVENIDA })
    .getByRole('link', { name: 'Cotizar mi seguro' })
    .click();
  await expect(page.getByRole('heading', { name: 'Elige tu banco' })).toBeVisible();
}

// Del crédito traído del banco a la cotización.
export async function cotizarConDatosDelBanco(page: Page, banco = 'Bancolombia') {
  await page.locator('#banco').selectOption(banco);
  await page.getByRole('button', { name: 'Buscar mi crédito' }).click();
  await expect(page.getByRole('heading', { name: 'Tu crédito hipotecario' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver mi cotización' }).click();
  await esperarCotizacion(page);
}

// De la captura manual a la cotización.
export async function cotizarConDatosDeclarados(page: Page, datos: DatosCredito) {
  await page.locator('#banco').selectOption('__OTRO__');
  await page.locator('#entidad-manual').fill(datos.entidadAcreedora);
  await page.locator('#valor-credito').fill(String(datos.valorCredito));
  await page.locator('#saldo').fill(String(datos.saldoInsoluto));
  await page.locator('#plazo').fill(String(datos.plazoRestanteMeses));
  await page.getByRole('button', { name: 'Ver mi cotización' }).click();
  await esperarCotizacion(page);
}

// La cotización vive en /cuenta/cotizaciones/actual (BITS-292).
export async function esperarCotizacion(page: Page) {
  await expect(page).toHaveURL(/\/cuenta\/cotizaciones\/actual$/);
  await expect(page.getByRole('heading', { name: 'Seguro de vida deudores' })).toBeVisible();
}

// Panel "Datos de tu crédito" de la cotización.
export function datosDelCredito(page: Page) {
  return page.getByRole('article', { name: 'Datos de tu crédito' });
}

// Modal 04K / 04L. El botón solo existe si la cotización es personalizada.
export function botonPorQueEstePrecio(page: Page) {
  return page.getByRole('button', { name: '¿Por qué este precio?' });
}

export async function abrirPorQueEstePrecio(page: Page) {
  await botonPorQueEstePrecio(page).click();
  const modal = page.getByRole('dialog', { name: '¿Por qué este precio?' });
  await expect(modal).toBeVisible();
  return modal;
}

// Tarjeta del Home que retoma la cotización activa.
export function tarjetaCotizacionEnCurso(page: Page) {
  return page.getByRole('link', { name: 'Retomar cotización vigente' });
}

// PANTALLA: control de "Tu casa" (botón + / − en Figma W2).
export function controlTuCasa(page: Page) {
  return page.getByRole('checkbox', { name: /tu casa/i });
}

// PANTALLA: bloque "Pagas cada mes" de la columna derecha.
export function resumenMensual(page: Page) {
  return page.getByRole('region', { name: /pagas cada mes/i });
}
