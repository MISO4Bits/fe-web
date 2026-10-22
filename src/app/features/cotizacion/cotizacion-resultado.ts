import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CoberturaPrecioCotizacion,
  CotizacionApiService,
  CotizacionRespuesta,
} from './cotizacion-api.service';
import { CreditoHipotecarioService } from './credito-hipotecario.service';
import { BienvenidaService } from '../home/bienvenida.service';

@Component({
  selector: 'app-cotizacion-resultado',
  imports: [RouterLink],
  templateUrl: './cotizacion-resultado.html',
  styleUrl: './cotizacion-resultado.scss',
})
export class CotizacionResultado implements OnInit {
  private readonly api = inject(CotizacionApiService);
  private readonly bienvenidaUsuario = inject(BienvenidaService);
  private readonly router = inject(Router);
  private readonly dialogoDeclinar =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialogoDeclinar');
  protected readonly eliminando = signal(false);
  protected readonly errorDeclinar = signal('');
  private readonly dialogoCondiciones =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialogoCondiciones');
  private readonly creditos = inject(CreditoHipotecarioService);
  protected readonly estadoConsentimiento = signal<'OTORGADO' | 'NO_OTORGADO' | 'REVOCADO' | null>(
    null,
  );
  protected readonly cotizacion = signal<CotizacionRespuesta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mostrarExplicacion = signal(false);
  protected readonly aceptaCondiciones = signal(false);
  protected readonly intentoContinuar = signal(false);
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
    // Solo una confirmación explícita del BFF permite atribuir origen bancario.
    // El contrato actual aún limita origenDatos a DECLARADO.
    return (this.cotizacion()?.origenDatos as string | undefined) === 'OPEN_FINANCE';
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

  protected continuar(): void {
    this.intentoContinuar.set(true);
  }

  protected abrirCondiciones(): void {
    this.dialogoCondiciones().nativeElement.showModal();
  }

  protected aceptarDesdeModal(): void {
    this.aceptaCondiciones.set(true);
    this.dialogoCondiciones().nativeElement.close();
  }

  protected abrirDeclinar(): void {
    this.errorDeclinar.set('');
    this.dialogoDeclinar().nativeElement.showModal();
  }

  protected cerrarDeclinar(): void {
    if (!this.eliminando()) this.dialogoDeclinar().nativeElement.close();
  }

  protected cancelarDeclinar(event: Event): void {
    if (this.eliminando()) event.preventDefault();
  }

  protected async confirmarDeclinar(): Promise<void> {
    if (this.eliminando() || !this.cotizacion()) return;
    this.eliminando.set(true);
    this.errorDeclinar.set('');
    try {
      await this.api.eliminarActual();
    } catch (error: unknown) {
      // Si ya no existe (por ejemplo, otra pestaña la eliminó), volver al inicio.
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.errorDeclinar.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Tu sesión expiró. Inicia sesión de nuevo para declinar la cotización.'
            : 'No pudimos eliminar tu cotización. Inténtalo de nuevo.',
        );
        this.eliminando.set(false);
        return;
      }
    }
    this.dialogoDeclinar().nativeElement.close();
    this.cotizacion.set(null);
    await this.router.navigate(['/cuenta']);
    this.eliminando.set(false);
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.aceptaCondiciones.set(false);
    this.intentoContinuar.set(false);
    this.estadoConsentimiento.set(null);
    this.casaSeleccionada.set(false);
    try {
      const [cotizacion, consentimiento] = await Promise.allSettled([
        this.api.actual(),
        this.creditos.estadoConsentimientoFinanciero(),
      ]);
      if (cotizacion.status === 'rejected') throw cotizacion.reason;
      const actual = cotizacion.value;
      if (actual) this.bienvenidaUsuario.recordar();
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
