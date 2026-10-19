import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoberturaPrecioCotizacion, CotizacionApiService, CotizacionRespuesta } from './cotizacion-api.service';
import { CreditoHipotecarioService } from './credito-hipotecario.service';

@Component({
  selector: 'app-cotizacion-resultado',
  imports: [RouterLink],
  templateUrl: './cotizacion-resultado.html',
  styleUrl: './cotizacion-resultado.scss',
})
export class CotizacionResultado implements OnInit {
  private readonly api = inject(CotizacionApiService);
  private readonly creditos = inject(CreditoHipotecarioService);
  protected readonly estadoConsentimiento = signal<'OTORGADO' | 'NO_OTORGADO' | 'REVOCADO' | null>(
    null,
  );
  protected readonly cotizacion = signal<CotizacionRespuesta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mostrarExplicacion = signal(false);
  protected readonly aceptaCondiciones = signal(false);
  protected readonly casaSeleccionada = signal(false);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected get coberturaVida(): CoberturaPrecioCotizacion | undefined {
    return this.cotizacion()?.oferta.desglose?.coberturas.find((c) => c.codigo === 'VIDA');
  }

  protected get coberturaHogar(): CoberturaPrecioCotizacion | undefined {
    return this.cotizacion()?.oferta.desglose?.coberturas.find((c) => c.codigo === 'HOGAR');
  }

  protected get primaVida(): number {
    return this.coberturaVida?.primaTotal ?? this.cotizacion()?.oferta.primaMensual ?? 0;
  }

  protected get totalMensual(): number {
    return this.primaVida + (this.casaSeleccionada() ? (this.coberturaHogar?.primaTotal ?? 0) : 0);
  }

  protected get personalizado(): boolean {
    const c = this.cotizacion();
    return !!(c?.oferta.personalizado && c.perfilRiesgo?.factores?.length);
  }

  protected get perfilDisponible(): boolean {
    const c = this.cotizacion();
    return !!(c?.oferta.personalizado && c.perfilRiesgo);
  }

  protected get datosVerificados(): boolean {
    // El contrato de CotizacionOut aún no expone origen OPEN_FINANCE.
    // Nunca atribuir procedencia bancaria a un dato sin confirmación del BFF.
    return this.cotizacion()?.origenDatos !== 'DECLARADO';
  }

  protected get sinAutorizacionFinanciera(): boolean {
    return this.estadoConsentimiento() === 'NO_OTORGADO';
  }

  protected get perfilPendiente(): boolean {
    return !this.perfilDisponible && !this.sinAutorizacionFinanciera;
  }
  protected get estadoVista(): '04' | '04F' | '04G' | '04H' | 'SIN_AUTORIZACION' {
    if (this.sinAutorizacionFinanciera) return 'SIN_AUTORIZACION';
    if (this.perfilDisponible && this.datosVerificados) return '04';
    if (this.perfilDisponible) return '04G';
    return this.datosVerificados ? '04H' : '04F';
  }
  protected abrirExplicacion(): void {
    if (this.personalizado) this.mostrarExplicacion.set(true);
  }
  protected cerrarExplicacion(): void {
    this.mostrarExplicacion.set(false);
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.estadoConsentimiento.set(null);
    this.casaSeleccionada.set(false);
    try {
      const [cotizacion, consentimiento] = await Promise.allSettled([
        this.api.actual(),
        this.creditos.estadoConsentimientoFinanciero(),
      ]);
      if (cotizacion.status === 'rejected') throw cotizacion.reason;
      const actual = cotizacion.value;
      this.cotizacion.set(actual?.estado === 'EXPIRADA' ? null : actual);
      // Si falla el endpoint de consentimientos, no inferir NO_OTORGADO.
      if (consentimiento.status === 'fulfilled') {
        this.estadoConsentimiento.set(consentimiento.value);
      }
    } catch {
      this.error.set('No fue posible cargar tu cotización.');
    } finally {
      this.cargando.set(false);
    }
  }
}
