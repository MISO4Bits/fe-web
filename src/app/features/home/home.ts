import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { RUTAS } from '../../nucleo/rutas';
import { BienvenidaService } from './bienvenida.service';
import { PolizasApiService, PolizaSolicitud } from '../solicitud/polizas-api.service';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly api = inject(CotizacionApiService);
  private readonly polizasApi = inject(PolizasApiService);
  protected readonly polizas = signal<PolizaSolicitud[]>([]);
  protected readonly cargandoPolizas = signal(true);
  protected readonly errorPolizas = signal(false);
  protected readonly estadosPoliza = {
    PENDIENTE: 'En revisión',
    EMITIDA: 'Aprobada',
    RECHAZADA: 'No aprobada',
    VENCIDA: 'Vencida',
  };
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
    void this.cargarPolizas();
  }
  protected readonly cargandoCotizacion = signal(true);
  protected readonly errorCotizacion = signal(false);

  protected async cargarPolizas(): Promise<void> {
    this.cargandoPolizas.set(true);
    this.errorPolizas.set(false);
    try {
      this.polizas.set(await this.polizasApi.listar());
    } catch {
      this.errorPolizas.set(true);
    } finally {
      this.cargandoPolizas.set(false);
    }
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
