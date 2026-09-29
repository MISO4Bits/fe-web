/**
 * Rutas del recorrido del Sprint 1, en un solo lugar.
 *
 * Tenerlas aqui evita que una cadena escrita a mano en una plantilla se
 * desincronice del enrutador. Cada una nombra la pantalla del prototipo y la
 * historia que la pide.
 */
export const RUTAS = {
  /** 01 Landing con precotizacion. BITS-215 */
  inicio: '/',
  /** 02 Precotizacion, resultado. BITS-215 */
  precotizacion: '/precotizacion',
  /** 03 Crear cuenta. BITS-93 y BITS-94 */
  registro: '/registro',
  /** 04 Confirma tu correo. BITS-93 */
  confirmaCorreo: '/registro/confirma-tu-correo',
  /** 01 Inicio de sesion. BITS-93 */
  ingreso: '/ingreso',
  /** 02 Home. BITS-95 */
  cuenta: '/cuenta',
  /** 12 Nueva cotizacion, elige tu banco. BITS-219 */
  nuevaCotizacion: '/cuenta/cotizaciones/nueva',
  /** 04 Cotizacion. BITS-95 */
  cotizacion: (id: string) => `/cuenta/cotizaciones/${id}`,
} as const;
