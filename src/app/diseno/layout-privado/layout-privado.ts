import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RUTAS } from '../../nucleo/rutas';
import { Sesion } from '../../nucleo/sesion/sesion';

/**
 * Armazon de las pantallas de la cuenta. Encabezado con la navegacion del
 * cliente y la salida de la sesion.
 */
@Component({
  selector: 'app-layout-privado',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './layout-privado.html',
  styleUrl: './layout-privado.scss',
})
export class LayoutPrivado {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly rutas = RUTAS;
  protected readonly cliente = this.sesion.actual;

  protected salir(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl(RUTAS.inicio);
  }
}
