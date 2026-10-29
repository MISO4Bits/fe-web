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
      { path: '', pathMatch: 'full', redirectTo: 'ingreso' },
      {
        path: 'verificar-correo',
        title: 'Verificar correo · Solventa',
        loadComponent: () =>
          import('./features/registro/pages/verificar-correo/verificar-correo').then(
            (m) => m.VerificarCorreo,
          ),
      },
      {
        path: 'crear-cuenta',
        title: 'Crear cuenta · Solventa',
        loadComponent: () =>
          import('./features/registro/pages/crear-cuenta/crear-cuenta').then((m) => m.CrearCuenta),
      },
      {
        path: 'ingreso',
        title: 'Iniciar sesión · Solventa',
        loadComponent: () => import('./features/login/login').then((m) => m.Login),
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
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./diseno/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
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
        pathMatch: 'full',
        title: 'Home · Solventa',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'cotizaciones/nueva',
        title: 'Nueva cotización · Solventa',
        loadComponent: () =>
          import('./features/cotizacion/nueva-cotizacion').then((m) => m.NuevaCotizacion),
      },
      {
        path: 'cotizaciones/actual',
        title: 'Tu cotización · Solventa',
        loadComponent: () =>
          import('./features/cotizacion/cotizacion-resultado').then((m) => m.CotizacionResultado),
      },
      {
        path: 'solicitud',
        title: 'Tu solicitud · Solventa',
        loadComponent: () => import('./features/solicitud/solicitud').then((m) => m.Solicitud),
      },
      {
        path: 'solicitudes/:id',
        title: 'Estado de tu solicitud · Solventa',
        loadComponent: () =>
          import('./features/solicitud/solicitud-estado').then((m) => m.SolicitudEstado),
      },
      pendiente('cotizaciones/:id', 'Tu cotización', '04 Cotización', 'BITS-264'),
    ],
  },
  { path: '**', redirectTo: 'ingreso' },
];
