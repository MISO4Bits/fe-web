import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DetallePolizaSolicitud, PolizasApiService } from '../solicitud/polizas-api.service';
import { Siniestro, SiniestrosApiService, TipoSiniestro } from './siniestros-api.service';

@Component({
  selector: 'app-siniestro-detalle',
  imports: [RouterLink],
  templateUrl: './siniestro-detalle.html',
  styleUrl: './siniestro-detalle.scss',
})
export class SiniestroDetalle {
  readonly id = input.required<string>();
  private readonly api = inject(SiniestrosApiService);
  private readonly polizasApi = inject(PolizasApiService);
  protected readonly siniestro = signal<Siniestro | null>(null);
  protected readonly poliza = signal<DetallePolizaSolicitud | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  private consulta = 0;

  constructor() {
    effect((cleanup) => {
      void this.consultar(this.id());
      cleanup(() => this.consulta++);
    });
  }

  protected cargar(): void {
    void this.consultar(this.id());
  }

  @HostListener('window:focus')
  protected alVolver(): void {
    const estado = this.siniestro()?.estado;
    if (!this.cargando() && (estado === 'EN_ESTUDIO' || estado === 'FALTA_INFORMACION')) {
      this.cargar();
    }
  }

  private async consultar(id: string): Promise<void> {
    const consulta = ++this.consulta;
    this.cargando.set(true);
    this.error.set('');
    try {
      const siniestro = await this.api.consultar(id);
      if (consulta !== this.consulta) return;
      this.siniestro.set(siniestro);
      this.cargando.set(false);
      this.poliza.set(null);
      // La póliza aporta datos de presentación, pero no condiciona el detalle del siniestro.
      try {
        const poliza = await this.polizasApi.consultarDetalle(siniestro.polizaId);
        if (consulta === this.consulta) this.poliza.set(poliza);
      } catch {
        // El siniestro sigue disponible si la consulta de la póliza falla.
      }
    } catch (error: unknown) {
      if (consulta !== this.consulta) return;
      this.siniestro.set(null);
      this.poliza.set(null);
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'No encontramos este siniestro.'
          : (error instanceof HttpErrorResponse && error.status === 401) ||
              (error instanceof Error && error.message === 'SESION_EXPIRADA')
            ? 'Tu sesión expiró. Inicia sesión de nuevo para consultar tu siniestro.'
            : 'No pudimos consultar tu siniestro. Inténtalo de nuevo.',
      );
    } finally {
      if (consulta === this.consulta) this.cargando.set(false);
    }
  }

  protected fecha(valor: string): string {
    // La hora de mediodía conserva la fecha civil que entrega un campo `date`.
    const fecha = new Date(valor.length === 10 ? `${valor}T12:00:00Z` : valor);
    if (Number.isNaN(fecha.getTime())) return 'No disponible';
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Bogota',
    })
      .format(fecha)
      .replace(/\./g, '');
  }

  protected tipo(tipo: TipoSiniestro): string {
    switch (tipo) {
      case 'INCAPACIDAD_TOTAL':
        return 'Incapacidad total';
      case 'SISMO_PARAMETRICO':
        return 'Terremoto';
      case 'INCENDIO_TERREMOTO':
        return 'Incendio o terremoto';
    }
  }

  protected producto(poliza: DetallePolizaSolicitud): string {
    const hogar = poliza.coberturas.some((c) => c.codigo === 'HOGAR');
    return hogar ? 'Vida para tu crédito y Tu casa' : 'Vida para tu crédito';
  }

  protected archivos(siniestro: Siniestro): string {
    const fotos = siniestro.archivos.filter((a) => a.clase === 'FOTO').length;
    const documentos = siniestro.archivos.filter((a) => a.clase === 'DOCUMENTO').length;
    return (
      [
        fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : '',
        documentos ? `${documentos} ${documentos === 1 ? 'documento' : 'documentos'}` : '',
      ]
        .filter(Boolean)
        .join(' y ') || 'Sin archivos'
    );
  }
}
