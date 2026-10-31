import { Injectable, inject, signal } from '@angular/core';
import { Sesion } from '../../nucleo/sesion/sesion';

/** Recuerda la última cotización creada para no volver a mostrar rechazos anteriores en Inicio. */
@Injectable({ providedIn: 'root' })
export class UltimaCotizacionService {
  private readonly sesion = inject(Sesion);
  private readonly fechas = new Map<string, number>();
  private readonly cambios = signal(0);

  private get clave(): string | null {
    const correo = this.sesion.actual()?.correo.trim().toLowerCase();
    return correo ? `solventa.ultima-cotizacion-creada:${correo}` : null;
  }

  creadaEn(): number {
    this.cambios();
    const clave = this.clave;
    if (!clave) return 0;
    let guardada = 0;
    try {
      const valor = Number(localStorage.getItem(clave));
      if (Number.isFinite(valor) && valor > 0) guardada = valor;
    } catch {
      // Si el navegador bloquea el almacenamiento, usar el registro de esta sesión.
    }
    return Math.max(guardada, this.fechas.get(clave) ?? 0);
  }

  recordar(creadaEn: string): void {
    const clave = this.clave;
    const fecha = Date.parse(creadaEn);
    if (!clave || !Number.isFinite(fecha) || fecha <= this.creadaEn()) return;
    this.fechas.set(clave, fecha);
    try {
      localStorage.setItem(clave, String(fecha));
    } catch {
      // Conservar la fecha en memoria durante esta sesión.
    }
    this.cambios.update((valor) => valor + 1);
  }
}
