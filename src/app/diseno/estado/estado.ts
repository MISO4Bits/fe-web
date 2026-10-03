import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { NombreDeIcono } from '../../nucleo/iconos/iconos';

/** Los tres momentos en que una pantalla no tiene contenido que mostrar. */
export type TipoDeEstado = 'cargando' | 'vacio' | 'error';

/**
 * Estado comun de una pantalla mientras carga, cuando no hay nada que mostrar
 * o cuando algo fallo. Vive aqui para que cada pantalla no lo resuelva por su
 * cuenta y para que el mensaje al cliente sea siempre el mismo.
 *
 * El texto lo pone quien lo usa: el mensaje pertenece a la pantalla, no al
 * armazon.
 */
@Component({
  selector: 'app-estado',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './estado.html',
  styleUrl: './estado.scss',
})
export class Estado {
  readonly tipo = input.required<TipoDeEstado>();
  readonly titulo = input.required<string>();
  readonly detalle = input<string>();
  readonly icono = input<NombreDeIcono>();
  readonly accion = input<string>();
  readonly alAccionar = input<() => void>();

  protected ejecutar(): void {
    this.alAccionar()?.();
  }
}
