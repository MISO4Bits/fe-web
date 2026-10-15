import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RUTAS } from '../../nucleo/rutas';
import { Sesion } from '../../nucleo/sesion/sesion';

@Component({
  selector: 'app-layout-privado',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './layout-privado.html',
  styleUrl: './layout-privado.scss',
})
export class LayoutPrivado {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  protected readonly rutas = RUTAS;
  protected readonly menuAbierto = signal(false);

  protected cerrarMenu(): void { this.menuAbierto.set(false); }

  protected salir(): void {
    this.cerrarMenu();
    this.sesion.cerrar();
    void this.router.navigateByUrl(RUTAS.login);
  }
}
