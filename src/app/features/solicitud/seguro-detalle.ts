import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  DecisionRenovacion,
  DetallePolizaSolicitud,
  PolizasApiService,
} from './polizas-api.service';
import { insigniaSeguro, plazoRenovacionAbierto } from './renovacion-poliza';
import {
  ResumenSiniestro,
  SiniestrosApiService,
  EstadoSiniestro,
  TipoSiniestro,
} from '../siniestros/siniestros-api.service';

@Component({
  selector: 'app-seguro-detalle',
  imports: [RouterLink],
  templateUrl: './seguro-detalle.html',
  styleUrl: './seguro-detalle.scss',
})
export class SeguroDetalle {
  readonly id = input.required<string>();
  private readonly api = inject(PolizasApiService);
  private readonly siniestrosApi = inject(SiniestrosApiService);
  private readonly injector = inject(Injector);
  private readonly dialogoRenovacion =
    viewChild<ElementRef<HTMLDialogElement>>('dialogoRenovacion');
  protected readonly insigniaSeguro = insigniaSeguro;
  protected readonly confirmarRechazo = signal(false);
  protected readonly guardandoDecision = signal(false);
  protected readonly errorRenovacion = signal('');
  protected readonly plazoRenovacionAbierto = plazoRenovacionAbierto;
  protected readonly porcentaje = new Intl.NumberFormat('es-CO', {
    style: 'percent',
    maximumFractionDigits: 2,
  });
  protected readonly poliza = signal<DetallePolizaSolicitud | null>(null);
  protected readonly siniestros = signal<ResumenSiniestro[]>([]);
  protected readonly siniestrosVida = computed(() =>
    this.siniestros().filter((s) => s.tipo === 'INCAPACIDAD_TOTAL'),
  );
  protected readonly siniestrosHogar = computed(() =>
    this.siniestros().filter((s) => s.tipo !== 'INCAPACIDAD_TOTAL'),
  );
  protected readonly gruposSiniestros = computed(() =>
    [
      { id: 'vida', titulo: 'VIDA PARA TU CRÉDITO', filas: this.siniestrosVida() },
      { id: 'hogar', titulo: 'TU CASA', filas: this.siniestrosHogar() },
    ].filter((grupo) => grupo.filas.length),
  );
  protected readonly cargandoSiniestros = signal(true);
  protected readonly errorSiniestros = signal(false);
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

  protected reintentarSiniestros(): void {
    void this.consultarSiniestros(this.id(), this.consulta);
  }

  private async consultar(id: string, mostrarPropuesta = true): Promise<void> {
    const consulta = ++this.consulta;
    this.dialogoRenovacion()?.nativeElement.close();
    this.confirmarRechazo.set(false);
    this.guardandoDecision.set(false);
    if (mostrarPropuesta) this.errorRenovacion.set('');
    this.cargando.set(true);
    this.error.set('');
    this.poliza.set(null);
    this.siniestros.set([]);
    this.mensajeDocumento.set('');
    this.descargando.set(false);
    void this.consultarSiniestros(id, consulta);
    try {
      const poliza = await this.api.consultarDetalle(id);
      if (consulta !== this.consulta) return;
      this.poliza.set(poliza);
      if (mostrarPropuesta && insigniaSeguro(poliza) === 'Por renovar') {
        afterNextRender(
          () => {
            if (consulta === this.consulta && insigniaSeguro(poliza) === 'Por renovar') {
              this.dialogoRenovacion()?.nativeElement.showModal();
            }
          },
          { injector: this.injector },
        );
      }
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

  protected cancelarDialogo(event: Event): void {
    if (this.guardandoDecision()) event.preventDefault();
  }

  protected cambiarConfirmacion(confirmar: boolean): void {
    this.errorRenovacion.set('');
    this.confirmarRechazo.set(confirmar);
  }

  protected async decidirRenovacion(decision: DecisionRenovacion): Promise<void> {
    if (this.guardandoDecision()) return;
    const poliza = this.poliza();
    if (poliza?.estado !== 'EMITIDA' || !poliza.renovacion) return;
    const consulta = this.consulta;
    this.guardandoDecision.set(true);
    this.errorRenovacion.set('');
    try {
      const actualizada = await this.api.decidirRenovacion(poliza.polizaId, decision);
      if (consulta !== this.consulta) return;
      this.dialogoRenovacion()?.nativeElement.close();
      this.poliza.set(actualizada);
    } catch (error: unknown) {
      if (consulta !== this.consulta) return;
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.errorRenovacion.set(
          'La propuesta ya no admite cambios. Actualizamos el estado de tu seguro.',
        );
        await this.consultar(poliza.polizaId, false);
      } else {
        this.errorRenovacion.set('No pudimos guardar tu decisión. Inténtalo de nuevo.');
      }
    } finally {
      if (consulta === this.consulta) this.guardandoDecision.set(false);
    }
  }

  private async consultarSiniestros(polizaId: string, consulta: number): Promise<void> {
    this.cargandoSiniestros.set(true);
    this.errorSiniestros.set(false);
    try {
      const siniestros = await this.siniestrosApi.listar();
      if (consulta !== this.consulta) return;
      this.siniestros.set(
        siniestros
          .filter((s) => s.polizaId === polizaId)
          .sort((a, b) => Date.parse(b.reportadoEn) - Date.parse(a.reportadoEn)),
      );
    } catch {
      if (consulta === this.consulta) this.errorSiniestros.set(true);
    } finally {
      if (consulta === this.consulta) this.cargandoSiniestros.set(false);
    }
  }

  protected producto(poliza: DetallePolizaSolicitud): string {
    const vida = poliza.coberturas.some((c) => c.codigo === 'VIDA');
    const hogar = poliza.coberturas.some((c) => c.codigo === 'HOGAR');
    if (vida && hogar) return 'Vida para tu crédito y Tu casa';
    return hogar ? 'Tu casa' : 'Vida para tu crédito';
  }

  protected tipoSiniestro(tipo: TipoSiniestro): string {
    switch (tipo) {
      case 'INCAPACIDAD_TOTAL':
        return 'Incapacidad total';
      case 'SISMO_PARAMETRICO':
        return 'Terremoto';
      case 'INCENDIO_TERREMOTO':
        return 'Incendio o terremoto';
    }
  }

  protected estadoSiniestro(estado: EstadoSiniestro): string {
    switch (estado) {
      case 'EN_ESTUDIO':
        return 'En estudio';
      case 'FALTA_INFORMACION':
        return 'Falta información';
      case 'PAGADO':
        return 'Pagado';
      case 'RECHAZADO':
        return 'Rechazado';
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
