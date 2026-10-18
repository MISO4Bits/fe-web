import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { RUTAS } from '../../nucleo/rutas';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly api = inject(CotizacionApiService);
  protected readonly cotizacionActual = signal<CotizacionRespuesta | null>(null);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  protected readonly rutas = RUTAS;
  constructor() {
    void this.cargarCotizacion();
  }
  private async cargarCotizacion(): Promise<void> {
    try {
      this.cotizacionActual.set(await this.api.actual());
    } catch {
      /* El Home sigue disponible si el BFF no responde. */
    }
  }
  // El BFF no informa si el usuario ingresa por primera vez. Mostrar en cada nueva sesión.
  protected readonly bienvenida = signal(true);
  protected cerrarBienvenida(): void {
    this.bienvenida.set(false);
  }
}
