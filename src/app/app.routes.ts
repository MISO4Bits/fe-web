import { Routes } from '@angular/router';
import { guardaSesion } from './nucleo/sesion/guarda-sesion';

/**
 * Rutas del recorrido del Sprint 1.
 *
 * Lo publico no exige sesion: la estimacion preliminar, el registro y el
 * ingreso. Lo privado si: el home de la cuenta y la cotizacion. Las pantallas
 * que aun no existen muestran un marcador que nombra la historia que las
 * entrega, para que el armazon se pueda recorrer completo desde ya.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./diseno/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      {
        path: '',
        title: 'Solventa · Cotiza tu seguro de vida',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '01 Landing con precotización', historia: 'BITS-258' },
      },
      {
        path: 'precotizacion',
        title: 'Solventa · Tu estimación preliminar',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '02 Precotización, resultado', historia: 'BITS-258' },
      },
      {
        path: 'registro',
        title: 'Solventa · Crea tu cuenta',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '03 Crear cuenta', historia: 'BITS-259 y BITS-260' },
      },
      {
        path: 'registro/confirma-tu-correo',
        title: 'Solventa · Confirma tu correo',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '04 Confirma tu correo', historia: 'BITS-259' },
      },
      {
        path: 'ingreso',
        title: 'Solventa · Ingresa a tu cuenta',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '01 Inicio de sesión', historia: 'BITS-261' },
      },
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
      {
        path: '',
        title: 'Solventa · Mis cotizaciones',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '02 Home, primera vez', historia: 'BITS-262' },
      },
      {
        path: 'cotizaciones/nueva',
        title: 'Solventa · Nueva cotización',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '12 Nueva cotización, elige tu banco', historia: 'BITS-263' },
      },
      {
        path: 'cotizaciones/:id',
        title: 'Solventa · Tu cotización',
        loadComponent: () =>
          import('./diseno/pantalla-pendiente/pantalla-pendiente').then((m) => m.PantallaPendiente),
        data: { pantalla: '04 Cotización', historia: 'BITS-264' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
