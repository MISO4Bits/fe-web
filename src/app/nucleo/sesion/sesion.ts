import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionService } from '../../core/services/session.service';

/** Lo minimo que el shell necesita saber de quien esta dentro. */
export interface Cliente {
  readonly nombre: string;
  readonly correo: string;
}

/**
 * Estado de la sesion del cliente.
 *
 * Hoy vive solo en memoria: quien la abre y quien la cierra es la capa de
 * datos de BITS-256, que todavia no existe. El shell solo necesita saber si
 * hay sesion para decidir que layout usar y si una ruta privada se puede
 * abrir, y eso ya se puede resolver contra esta senal.
 */
@Injectable({ providedIn: 'root' })
export class Sesion {
  private readonly cliente = signal<Cliente | null>(null);

  private readonly registro = inject(SessionService);
  readonly actual = this.cliente.asReadonly();
  readonly hayCliente = computed(() => this.actual() !== null);

  abrir(cliente: Cliente): void {
    this.cliente.set(cliente);
  }

  cerrar(): void {
    this.cliente.set(null);
    this.registro.clear();
  }
}
