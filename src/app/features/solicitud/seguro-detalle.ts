import { Component, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DetallePolizaSolicitud, PolizasApiService } from './polizas-api.service';

@Component({
  selector: 'app-seguro-detalle',
  imports: [RouterLink],
  templateUrl: './seguro-detalle.html',
  styleUrl: './seguro-detalle.scss',
})
export class SeguroDetalle {
  readonly id = input.required<string>();
  private readonly api = inject(PolizasApiService);
  protected readonly poliza = signal<DetallePolizaSolicitud | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly descargando = signal(false);
  protected readonly mensajeDocumento = signal('');
  protected readonly errorDocumento = signal(false);
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  private consulta = 0;

  constructor() {
    effect((cleanup) => {
      const id = this.id();
      void this.consultar(id);
      cleanup(() => {
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
    this.mensajeDocumento.set('');
    this.descargando.set(false);
    try {
      const poliza = await this.api.consultarDetalle(id);
      if (consulta === this.consulta) this.poliza.set(poliza);
    } catch (error: unknown) {
      if (consulta !== this.consulta) return;
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'No encontramos esta póliza.'
          : 'No pudimos consultar tu seguro. Inténtalo de nuevo.',
      );
    } finally {
      if (consulta === this.consulta) this.cargando.set(false);
    }
  }

  protected fecha(valor?: string | null): string {
    if (!valor || !Number.isFinite(Date.parse(valor))) return 'No disponible';
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(new Date(valor.length === 10 ? valor + 'T12:00:00Z' : valor));
  }

  protected async verDocumento(): Promise<void> {
    if (this.descargando() || this.poliza()?.estado !== 'EMITIDA') return;
    const consulta = this.consulta;
    this.descargando.set(true);
    this.mensajeDocumento.set('');
    this.errorDocumento.set(false);
    try {
      // Se solicita un enlace nuevo en cada clic para no reutilizar URLs temporales vencidas.
      const documento = await this.api.documento(this.id());
      if (consulta !== this.consulta) return;
      if (documento.estado === 'GENERANDO') {
        this.mensajeDocumento.set(
          'Estamos generando tu documento. Inténtalo de nuevo en unos momentos.',
        );
        return;
      }
      const url = new URL(documento.url ?? '');
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        (documento.expiraEn && !(Date.parse(documento.expiraEn) > Date.now()))
      ) {
        throw new Error('ENLACE_NO_DISPONIBLE');
      }
      // Un enlace temporal firmado no requiere enviar el token de sesión al destino.
      window.location.assign(url.href);
    } catch (error: unknown) {
      if (consulta !== this.consulta) return;
      this.errorDocumento.set(true);
      this.mensajeDocumento.set(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'El documento solo está disponible cuando la póliza está emitida.'
          : 'No pudimos abrir tu documento. Inténtalo de nuevo.',
      );
    } finally {
      if (consulta === this.consulta) this.descargando.set(false);
    }
  }
}
