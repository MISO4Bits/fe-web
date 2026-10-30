import { Component, ElementRef, OnInit, computed, signal, inject, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { RUTAS } from '../../nucleo/rutas';
import { BienvenidaService } from './bienvenida.service';
import { PolizasApiService, ResumenPolizaSolicitud } from '../solicitud/polizas-api.service';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly api = inject(CotizacionApiService);
  private readonly polizasApi = inject(PolizasApiService);
  private readonly router = inject(Router);
  private readonly confirmacion = viewChild.required<ElementRef<HTMLDialogElement>>('confirmacion');
  private readonly solicitudes = signal<ResumenPolizaSolicitud[]>([]);
  protected readonly solicitudPendiente = computed(() =>
    this.solicitudes().find((p) => p.estado === 'PENDIENTE'),
  );
  protected readonly cargandoSolicitudes = signal(true);
  protected readonly errorSolicitudes = signal(false);
  private readonly bienvenidaUsuario = inject(BienvenidaService);
  protected readonly cotizacionActual = signal<CotizacionRespuesta | null>(null);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  protected readonly rutas = RUTAS;
  ngOnInit(): void {
    void this.cargarCotizacion();
    void this.cargarSolicitudes();
  }
  protected readonly cargandoCotizacion = signal(true);
  protected readonly errorCotizacion = signal(false);

  protected async cargarSolicitudes(): Promise<void> {
    this.cargandoSolicitudes.set(true);
    this.errorSolicitudes.set(false);
    try {
      this.solicitudes.set(await this.polizasApi.listar());
    } catch {
      this.errorSolicitudes.set(true);
    } finally {
      this.cargandoSolicitudes.set(false);
    }
  }

  protected nuevaCotizacion(): void {
    if (this.cargandoSolicitudes() || this.errorSolicitudes()) return;
    if (this.solicitudPendiente()) this.confirmacion().nativeElement.showModal();
    else void this.router.navigate([RUTAS.nuevaCotizacion]);
  }

  protected cerrarConfirmacion(): void {
    this.confirmacion().nativeElement.close();
  }

  protected cotizarDeNuevo(): void {
    this.cerrarConfirmacion();
    void this.router.navigate([RUTAS.nuevaCotizacion]);
  }

  protected async cargarCotizacion(): Promise<void> {
    this.cargandoCotizacion.set(true);
    this.errorCotizacion.set(false);
    try {
      const actual = await this.api.actual();
      this.cotizacionActual.set(actual?.estado === 'EXPIRADA' ? null : actual);
      this.prepararBienvenida(actual !== null);
    } catch (error: unknown) {
      this.cotizacionActual.set(null);
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.errorCotizacion.set(true);
      } else {
        this.prepararBienvenida(false);
      }
    } finally {
      this.cargandoCotizacion.set(false);
    }
  }
  protected readonly bienvenida = signal(false);
  private prepararBienvenida(yaCotizo: boolean): void {
    this.bienvenida.set(!yaCotizo && !this.bienvenidaUsuario.vista());
    this.bienvenidaUsuario.recordar();
  }
  protected cerrarBienvenida(): void {
    this.bienvenida.set(false);
  }
}
