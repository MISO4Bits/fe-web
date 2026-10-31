import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DetallePolizaSolicitud, PolizasApiService } from './polizas-api.service';

@Component({
  selector: 'app-seguro-cuota',
  imports: [RouterLink],
  templateUrl: './seguro-cuota.html',
  styleUrl: './seguro-cuota.scss',
})
export class SeguroCuota {
  readonly id = input.required<string>();
  private readonly api = inject(PolizasApiService);
  protected readonly poliza = signal<DetallePolizaSolicitud | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly vida = computed(() =>
    this.poliza()?.coberturas?.find((c) => c.codigo === 'VIDA'),
  );
  protected readonly hogar = computed(() =>
    this.poliza()?.coberturas?.find((c) => c.codigo === 'HOGAR'),
  );
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  protected readonly fechaInicio = computed(() => {
    const fecha = this.poliza()?.emitidaEn;
    return fecha
      ? new Intl.DateTimeFormat('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'America/Bogota',
        }).format(new Date(fecha))
      : '';
  });
  private activa = false;
  private consulta = 0;

  constructor() {
    effect((onCleanup) => {
      const id = this.id();
      this.activa = true;
      this.poliza.set(null);
      void this.consultar(id);
      onCleanup(() => {
        this.activa = false;
        this.consulta++;
      });
    });
  }

  protected cargar(): void {
    void this.consultar(this.id());
  }

  private async consultar(id: string): Promise<void> {
    const consulta = ++this.consulta;
    this.cargando.set(true);
    this.error.set('');
    this.poliza.set(null);
    try {
      const poliza = await this.api.consultarDetalle(id);
      if (!this.activa || consulta !== this.consulta) return;
      if (
        poliza.estado === 'EMITIDA' &&
        (!poliza.emitidaEn ||
          !Number.isFinite(Date.parse(poliza.emitidaEn)) ||
          !poliza.datosCredito?.entidadAcreedora?.trim() ||
          !Number.isFinite(poliza.primaTotalMensual) ||
          poliza.primaTotalMensual < 0 ||
          !Array.isArray(poliza.coberturas) ||
          !poliza.coberturas.some((c) => c.codigo === 'VIDA') ||
          poliza.coberturas.some((c) =>
            [c.primaNeta, c.iva, c.primaTotal].some((n) => !Number.isFinite(n) || n < 0),
          ))
      )
        throw new Error('DATOS_INCOMPLETOS');
      this.poliza.set(poliza);
    } catch (error: unknown) {
      if (!this.activa || consulta !== this.consulta) return;
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'No encontramos esta póliza.'
          : (error instanceof HttpErrorResponse && error.status === 401) ||
              (error instanceof Error && error.message === 'SESION_EXPIRADA')
            ? 'Tu sesión expiró. Inicia sesión de nuevo para consultar tu seguro.'
            : 'No pudimos consultar el detalle de tu seguro. Inténtalo de nuevo.',
      );
    } finally {
      if (this.activa && consulta === this.consulta) this.cargando.set(false);
    }
  }
}
