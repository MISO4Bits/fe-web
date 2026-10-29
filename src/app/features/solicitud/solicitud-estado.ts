import { Component, HostListener, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PolizasApiService, PolizaSolicitud } from './polizas-api.service';

@Component({
  selector: 'app-solicitud-estado',
  imports: [RouterLink],
  templateUrl: './solicitud-estado.html',
  styleUrl: './solicitud-estado.scss',
})
export class SolicitudEstado {
  readonly id = input.required<string>();
  private readonly api = inject(PolizasApiService);
  protected readonly poliza = signal<PolizaSolicitud | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  private consulta = 0;
  private activa = false;

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

  @HostListener('window:focus')
  protected alVolver(): void {
    if (this.poliza()?.estado === 'PENDIENTE' && !this.cargando()) this.cargar();
  }

  private async consultar(id: string): Promise<void> {
    const consulta = ++this.consulta;
    this.cargando.set(true);
    this.error.set('');
    try {
      const poliza = await this.api.consultar(id);
      if (this.activa && consulta === this.consulta) this.poliza.set(poliza);
    } catch (error: unknown) {
      if (!this.activa || consulta !== this.consulta) return;
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'No encontramos esta solicitud.'
          : (error instanceof HttpErrorResponse && error.status === 401) ||
              (error instanceof Error && error.message === 'SESION_EXPIRADA')
            ? 'Tu sesión expiró. Inicia sesión de nuevo para consultar tu solicitud.'
            : 'No pudimos consultar tu solicitud. Inténtalo de nuevo.',
      );
    } finally {
      if (this.activa && consulta === this.consulta) this.cargando.set(false);
    }
  }

  protected fecha(valor: string): string {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
      ? ''
      : new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Bogota',
        })
          .format(fecha)
          .replace(/\.$/, '');
  }
}
