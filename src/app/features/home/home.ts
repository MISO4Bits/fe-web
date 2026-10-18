import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { RUTAS } from '../../nucleo/rutas';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly api = inject(CotizacionApiService);
  protected readonly cotizacionActual = signal<CotizacionRespuesta | null>(null);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  protected readonly rutas = RUTAS;
  ngOnInit(): void {
    void this.cargarCotizacion();
  }
  protected readonly cargandoCotizacion = signal(true);
  protected readonly errorCotizacion = signal(false);

  protected async cargarCotizacion(): Promise<void> {
    this.cargandoCotizacion.set(true);
    this.errorCotizacion.set(false);
    try {
      const actual = await this.api.actual();
      this.cotizacionActual.set(actual?.estado === 'EXPIRADA' ? null : actual);
    } catch (error: unknown) {
      this.cotizacionActual.set(null);
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.errorCotizacion.set(true);
      }
    } finally {
      this.cargandoCotizacion.set(false);
    }
  }
  // El BFF no informa si el usuario ingresa por primera vez. Mostrar en cada nueva sesión.
  protected readonly bienvenida = signal(true);
  protected cerrarBienvenida(): void {
    this.bienvenida.set(false);
  }
}
