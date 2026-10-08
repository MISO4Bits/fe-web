import { Routes } from '@angular/router';
import { SiteShell } from './shared/components/site-shell/site-shell';
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
      { path: '**', redirectTo: 'cuenta' },
    ],
  },
];
