import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from './cotizacion-api.service';

@Component({
  selector: 'app-cotizacion-resultado',
  imports: [RouterLink],
  templateUrl: './cotizacion-resultado.html',
  styleUrl: './cotizacion-resultado.scss',
})
export class CotizacionResultado {
  private readonly api = inject(CotizacionApiService);
  protected readonly cotizacion = signal<CotizacionRespuesta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mostrarExplicacion = signal(false);
  protected readonly aceptaCondiciones = signal(false);
  protected readonly incluirCasa = signal(false);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  constructor() {
    void this.cargar();
  }

  protected get personalizado(): boolean {
    const c = this.cotizacion();
    return !!(c?.oferta.personalizado && c.perfilRiesgo);
  }

  protected get datosVerificados(): boolean {
    // El contrato de CotizacionOut aún no expone origen OPEN_FINANCE.
    // Nunca atribuir procedencia bancaria a un dato sin confirmación del BFF.
    return this.cotizacion()?.origenDatos !== 'DECLARADO';
  }

  protected get sinAutorizacionFinanciera(): boolean {
    return (
      this.cotizacion()?.oferta.fuentesNoDisponibles?.some((f) =>
        /OPEN[_ -]?FINANCE|AUTORIZACI[ÓO]N|CONSENTIMIENTO/i.test(f),
      ) ?? false
    );
  }

  protected get perfilPendiente(): boolean {
    return !this.personalizado && !this.sinAutorizacionFinanciera;
  }
  protected get estadoVista(): '04' | '04F' | '04G' | '04H' | 'SIN_AUTORIZACION' {
    if (this.sinAutorizacionFinanciera) return 'SIN_AUTORIZACION';
    if (this.personalizado && this.datosVerificados) return '04';
    if (this.personalizado) return '04G';
    return this.datosVerificados ? '04H' : '04F';
  }
  protected abrirExplicacion(): void {
    this.mostrarExplicacion.set(true);
  }
  protected cerrarExplicacion(): void {
    this.mostrarExplicacion.set(false);
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.cotizacion.set(await this.api.actual());
    } catch {
      this.error.set('No fue posible cargar tu cotización.');
    } finally {
      this.cargando.set(false);
    }
  }
}
