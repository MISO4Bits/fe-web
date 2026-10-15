import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Sesion } from './sesion';
import { RUTAS } from '../rutas';
import { SessionService } from '../../core/services/session.service';

/**
 * Deja pasar a una ruta privada solo si hay sesion. Si no la hay, manda al
 * inicio de sesión, y recuerda a donde iba, para devolver a la persona a su destino en
 * lugar de dejarla en el home.
 */
export const guardaSesion: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(Sesion);
  const router = inject(Router);

  if (sesion.hayCliente() && inject(SessionService).hasRefreshToken()) {
    return true;
  }

  return router.createUrlTree([RUTAS.login], {
    queryParams: { destino: estado.url },
  });
};
