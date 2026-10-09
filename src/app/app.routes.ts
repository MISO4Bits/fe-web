import { Route, Routes } from '@angular/router';
import { SiteShell } from './shared/components/site-shell/site-shell';
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

export const routes: Routes = [
  {
    path: '',
    component: SiteShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'cuenta' },
      {
        path: 'precotizacion/resultado',
        title: 'Tu precotización · Solventa',
        loadComponent: () =>
          import('./features/precotizacion/pages/resultado/resultado').then((m) => m.Resultado),
      },
      {
        path: 'crear-cuenta',
        title: 'Crear cuenta · Solventa',
        loadComponent: () =>
          import('./features/registro/pages/crear-cuenta/crear-cuenta').then((m) => m.CrearCuenta),
      },
      {
        path: 'cuenta',
        title: 'Mi cuenta · Solventa',
        loadComponent: () => import('./features/cuenta/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'confirmar-correo',
        title: 'Confirmar correo · Solventa',
        loadComponent: () =>
          import('./features/registro/pages/confirmar-correo/confirmar-correo').then(
            (m) => m.ConfirmarCorreo,
          ),
      },
      { path: 'registro', redirectTo: 'crear-cuenta', pathMatch: 'full' },
      { path: 'registro/confirma-tu-correo', redirectTo: 'confirmar-correo', pathMatch: 'full' },
      { path: 'precotizacion', redirectTo: 'precotizacion/resultado', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./diseno/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      pendiente('ingreso', 'Ingresa a tu cuenta', '01 Inicio de sesión', 'BITS-261'),
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
      pendiente(
        'cotizaciones/nueva',
        'Nueva cotización',
        '12 Nueva cotización, elige tu banco',
        'BITS-263',
      ),
      pendiente('cotizaciones/:id', 'Tu cotización', '04 Cotización', 'BITS-264'),
    ],
  },
  { path: '**', redirectTo: 'cuenta' },
];
