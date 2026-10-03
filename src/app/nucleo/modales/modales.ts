import { Injectable, inject } from '@angular/core';
import type { ComponentType } from '@angular/cdk/portal';
import { MatDialog, type MatDialogConfig, type MatDialogRef } from '@angular/material/dialog';

/**
 * Apertura de modales con las convenciones del producto.
 *
 * Las tres pantallas de modal del Sprint 1 (datos personales, datos
 * financieros y permiso necesario) se abren sobre la pantalla que las invoca
 * y la conservan detras. Material ya devuelve el foco al cerrar; aqui se fija
 * el ancho, el radio y el comportamiento del descarte para que los tres se
 * comporten igual.
 */
@Injectable({ providedIn: 'root' })
export class Modales {
  private readonly dialogo = inject(MatDialog);

  abrir<C, D = unknown, R = unknown>(
    componente: ComponentType<C>,
    datos?: D,
    ajustes?: MatDialogConfig<D>,
  ): MatDialogRef<C, R> {
    return this.dialogo.open<C, D, R>(componente, {
      data: datos,
      width: 'min(560px, calc(100vw - 32px))',
      maxHeight: 'calc(100vh - 64px)',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      // El cliente puede cerrar con Escape o tocando por fuera: ninguno de los
      // tres modales del sprint retiene a la persona.
      disableClose: false,
      ...ajustes,
    });
  }

  cerrarTodos(): void {
    this.dialogo.closeAll();
  }
}
