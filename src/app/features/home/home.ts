import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RUTAS } from '../../nucleo/rutas';
@Component({ selector:'app-home', imports:[RouterLink], templateUrl:'./home.html', styleUrl:'./home.scss' })
export class Home {
  protected readonly rutas = RUTAS;
  // El BFF no informa si el usuario ingresa por primera vez. Mostrar en cada nueva sesión.
  protected readonly bienvenida = signal(true);
  protected cerrarBienvenida(): void { this.bienvenida.set(false); }
}
