import { Route, Routes } from '@angular/router';
import { guardaSesion } from './nucleo/sesion/guarda-sesion';

/**
 * Ruta de una pantalla que todavia no se construye.
 *
 * Cada una nombra su pantalla del prototipo y la tarea que la entrega, para
 * que el recorrido se pueda atravesar completo antes de que las pantallas
 * existan. Cada marcador desaparece cuando su tarea las construye, y esta
 * funcion se va con el ultimo.
 */
function pendiente(path: string, title: string, pantalla: string, historia: string): Route {
  return {
    path,
    title: `Solventa · ${title}`,
    loadComponent: () =>
      import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
    data: { pantalla, historia },
  };
}

/**
 * Rutas del recorrido del Sprint 1.
 *
 * Lo publico no exige sesion: la estimacion preliminar, el registro y el
 * ingreso. Lo privado si: el home de la cuenta y la cotizacion.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./diseno/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      pendiente('', 'Cotiza tu seguro de vida', '01 Landing con precotización', 'BITS-258'),
      pendiente(
        'precotizacion',
        'Tu estimación preliminar',
        '02 Precotización, resultado',
        'BITS-258',
      ),
      pendiente('registro', 'Crea tu cuenta', '03 Crear cuenta', 'BITS-259 y BITS-260'),
      pendiente(
        'registro/confirma-tu-correo',
        'Confirma tu correo',
        '04 Confirma tu correo',
        'BITS-259',
      ),
      pendiente('ingreso', 'Ingresa a tu cuenta', '01 Inicio de sesión', 'BITS-261'),
      // Muestra del tema. No es una pantalla del producto: sirve para comparar
      // los componentes contra el prototipo. Se retira cuando el Design System
      // quede verificado.
      {
        path: 'muestra',
        title: 'Solventa · Muestra del tema',
        loadComponent: () => import('./muestra-tema/muestra-tema').then((m) => m.MuestraTema),
      },
    ],
  },
  {
    path: 'cuenta',
    canActivate: [guardaSesion],
    loadComponent: () =>
      import('./diseno/layout-privado/layout-privado').then((m) => m.LayoutPrivado),
    children: [
      pendiente('', 'Mis cotizaciones', '02 Home, primera vez', 'BITS-262'),
      pendiente(
        'cotizaciones/nueva',
        'Nueva cotización',
        '12 Nueva cotización, elige tu banco',
        'BITS-263',
      ),
      pendiente('cotizaciones/:id', 'Tu cotización', '04 Cotización', 'BITS-264'),
    ],
  },
  { path: '**', redirectTo: '' },
];
