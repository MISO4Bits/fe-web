import { Injectable, inject } from '@angular/core';
import { Sesion } from '../../nucleo/sesion/sesion';

/** Recuerda en este navegador que el usuario ya conoce el recorrido de cotización. */
@Injectable({ providedIn: 'root' })
export class BienvenidaService {
  private readonly sesion = inject(Sesion);
  private readonly vistas = new Set<string>();

  private get clave(): string | null {
    const correo = this.sesion.actual()?.correo.trim().toLowerCase();
    return correo ? `solventa.bienvenida-cotizacion:${correo}` : null;
  }

  vista(): boolean {
    const clave = this.clave;
    if (!clave) return false;
    try {
      return this.vistas.has(clave) || localStorage.getItem(clave) === '1';
    } catch {
      return this.vistas.has(clave);
    }
  }

  recordar(): void {
    const clave = this.clave;
    if (!clave) return;
    this.vistas.add(clave);
    try {
      localStorage.setItem(clave, '1');
    } catch {
      // Con almacenamiento bloqueado, conservar la preferencia durante esta sesión.
    }
  }
}
