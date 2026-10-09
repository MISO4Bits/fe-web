import { Component, input } from '@angular/core';
import { Estado } from '../estado/estado';

/**
 * Marcador de una pantalla que todavia no se construye.
 *
 * El armazon del Sprint 1 se puede recorrer completo antes de que existan las
 * pantallas: cada ruta declara que historia la pide y que pantalla del
 * prototipo la sustenta, de modo que quien construya sepa a que responde.
 * Cada marcador desaparece cuando su tarea entrega la pantalla.
 */
@Component({
  selector: 'app-pantalla-pendiente',
  imports: [Estado],
  template: `
    <div class="solventa-contenedor">
      <app-estado
        tipo="vacio"
        icono="browsers"
        [titulo]="pantalla()"
        [detalle]="'Esta pantalla la construye ' + historia() + '.'"
      />
    </div>
  `,
})
export class PantallaPendiente {
  /** Nombre de la pantalla en el prototipo. */
  readonly pantalla = input.required<string>();
  /** Historia de Jira que la entrega. */
  readonly historia = input.required<string>();
}
