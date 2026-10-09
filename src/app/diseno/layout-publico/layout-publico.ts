import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { RUTAS } from '../../nucleo/rutas';

/**
 * Armazon de las pantallas que no exigen sesion: el registro y otras vistas públicas. Encabezado con la marca y el acceso a la cuenta,
 * y pie con la informacion legal.
 */
@Component({
  selector: 'app-layout-publico',
  imports: [RouterOutlet, RouterLink, MatButtonModule],
  templateUrl: './layout-publico.html',
  styleUrl: './layout-publico.scss',
})
export class LayoutPublico {
  protected readonly rutas = RUTAS;
  protected readonly anio = new Date().getFullYear();
}
