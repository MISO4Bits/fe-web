import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizacionApiService } from './cotizacion-api.service';
import {
  CreditoHipotecario,
  CreditoHipotecarioService,
  CreditosHipotecariosRespuesta,
  EntidadFinanciera,
} from './credito-hipotecario.service';

type Paso = 'banco' | 'consultando' | 'datos' | 'manual';
type Origen = 'VERIFICADO' | 'DECLARADO';
type MotivoManual =
  | 'otro-banco'
  | 'sin-consentimiento'
  | 'sin-hipotecas'
  | 'error-consulta'
  | 'sesion-expirada'
  | null;
interface DatosCotizacion {
  entidadAcreedora: string;
  valorCredito: number;
  saldoInsoluto: number;
  plazoMeses: number;
  origen: Origen;
  fechaConsulta: string | null;
}

@Component({
  selector: 'app-nueva-cotizacion',
  imports: [FormsModule],
  templateUrl: './nueva-cotizacion.html',
  styleUrl: './nueva-cotizacion.scss',
})
export class NuevaCotizacion {
  private readonly api = inject(CreditoHipotecarioService);
  private readonly cotizaciones = inject(CotizacionApiService);
  private readonly router = inject(Router);
  protected readonly enviando = signal(false);
  protected readonly errorCotizacion = signal('');
  protected readonly paso = signal<Paso>('banco');
  protected readonly entidad = signal('');
  protected readonly bancoNoListado = '__OTRO__';
  protected readonly entidades = signal<EntidadFinanciera[]>([]);
  protected readonly mensaje = signal('');
  protected readonly motivoManual = signal<MotivoManual>(null);
  protected readonly puedeReintentar = computed(() => this.motivoManual() === 'error-consulta');
  protected readonly consultado = signal<CreditosHipotecariosRespuesta | null>(null);
  protected readonly creditos = signal<CreditoHipotecario[]>([]);
  protected readonly seleccionado = signal<number>(0);
  protected readonly guardado = signal<DatosCotizacion | null>(null);
  protected readonly credito = computed(() => this.creditos()[this.seleccionado()] ?? null);
  protected manual = {
    entidadAcreedora: '',
    valorCredito: null as number | null,
    saldoInsoluto: null as number | null,
    plazoMeses: null as number | null,
  };
  protected readonly errores = signal<string[]>([]);
  protected readonly erroresCampo = signal<Record<string, string>>({});

  protected limpiarErrorCampo(campo: string): void {
    this.erroresCampo.update((actual) => {
      const copia = { ...actual };
      delete copia[campo];
      return copia;
    });
    this.errores.set(Object.values(this.erroresCampo()));
  }
  protected readonly fechaConsultaFormateada = computed(() => {
    const fecha = this.consultado()?.fechaConsulta;
    if (!fecha) return null;
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return null;
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(valor);
  });
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected elegirBanco(nombre: string): void {
    if (nombre === this.bancoNoListado) {
      this.entidad.set('');
      this.usarManual();
      return;
    }
    this.entidad.set(nombre);
    this.mensaje.set('');
    this.motivoManual.set(null);
    this.errores.set([]);
    this.consultado.set(null);
    this.creditos.set([]);
  }

  protected async continuar(): Promise<void> {
    if (!this.entidad() || this.paso() === 'consultando') return;
    this.paso.set('consultando');
    this.mensaje.set('');
    this.motivoManual.set(null);
    try {
      const autorizado = await this.api.tieneConsentimientoFinanciero();
      if (!autorizado) {
        this.mensaje.set(
          'No autorizaste la consulta de datos financieros. Ingresa los datos de tu crédito manualmente.',
        );
        this.usarManual('sin-consentimiento');
        return;
      }
      const respuesta = await this.api.consultar();
      this.consultado.set(respuesta);
      this.entidades.set(respuesta.entidades);
      const banco = this.entidad().toLocaleLowerCase('es-CO');
      const coincidencias = respuesta.creditos.filter(
        (credito) =>
          credito.entidadNombre.toLocaleLowerCase('es-CO') === banco ||
          respuesta.entidades.some(
            (entidad) =>
              entidad.nombre.toLocaleLowerCase('es-CO') === banco &&
              entidad.id === credito.entidadId,
          ),
      );
      if (respuesta.estado === 'DISPONIBLE' && coincidencias.length) {
        this.creditos.set(coincidencias);
        this.seleccionado.set(0);
        this.paso.set('datos');
        return;
      }
      const motivo: MotivoManual =
        respuesta.estado === 'SIN_CONSENTIMIENTO'
          ? 'sin-consentimiento'
          : respuesta.estado === 'SIN_HIPOTECAS' || respuesta.estado === 'DISPONIBLE'
            ? 'sin-hipotecas'
            : 'error-consulta';
      this.mensaje.set(
        respuesta.estado === 'SIN_CONSENTIMIENTO'
          ? 'No hay autorización vigente para consultar datos financieros. Puedes ingresarlos manualmente.'
          : motivo === 'sin-hipotecas'
            ? 'No encontramos un crédito hipotecario para esta entidad.'
            : 'No fue posible obtener los datos de este banco. Puedes reintentar o ingresarlos manualmente.',
      );
      this.usarManual(motivo);
    } catch (error: unknown) {
      const expired = error instanceof Error && error.message === 'SESION_EXPIRADA';
      this.mensaje.set(
        expired
          ? 'Tu sesión ha expirado. Vuelve a iniciar sesión para consultar el banco.'
          : 'No pudimos consultar el banco en este momento. Puedes reintentar o ingresar los datos manualmente.',
      );
      this.usarManual(expired ? 'sesion-expirada' : 'error-consulta');
    }
  }

  protected usarManual(motivo: MotivoManual = 'otro-banco'): void {
    this.motivoManual.set(motivo);
    this.manual.entidadAcreedora = this.entidad();
    this.manual.valorCredito = null;
    this.manual.saldoInsoluto = null;
    this.manual.plazoMeses = null;
    this.errores.set([]);
    this.erroresCampo.set({});
    this.paso.set('manual');
  }

  protected bancoFijado(): boolean {
    return this.entidad().length > 0;
  }

  protected volver(): void {
    this.paso.set('banco');
    this.mensaje.set('');
    this.motivoManual.set(null);
  }

  protected cambiarBanco(): void {
    this.volver();
    this.entidad.set('');
    this.consultado.set(null);
    this.creditos.set([]);
    this.seleccionado.set(0);
    this.errores.set([]);
    this.erroresCampo.set({});
    this.guardado.set(null);
    this.manual = {
      entidadAcreedora: '',
      valorCredito: null,
      saldoInsoluto: null,
      plazoMeses: null,
    };
  }

  protected reintentar(): Promise<void> {
    return this.puedeReintentar() ? this.continuar() : Promise.resolve();
  }

  protected async guardarVerificado(): Promise<void> {
    const credito = this.credito();
    if (!credito) return;
    await this.crearCotizacion({
      entidadAcreedora: credito.entidadNombre,
      valorCredito: credito.valorCredito,
      saldoInsoluto: credito.saldoInsoluto,
      plazoMeses: credito.plazoRestanteMeses,
      origen: 'VERIFICADO',
      fechaConsulta: this.consultado()?.fechaConsulta ?? null,
    });
  }

  protected async guardarManual(): Promise<void> {
    const d = this.manual;
    const campos: Record<string, string> = {};
    if (d.entidadAcreedora.trim().length < 2 || d.entidadAcreedora.trim().length > 80)
      campos['entidad'] = 'Ingresa una entidad acreedora válida (2 a 80 caracteres).';
    if (d.valorCredito === null || !Number.isFinite(d.valorCredito) || d.valorCredito < 10000000)
      campos['valor'] = 'El valor del crédito debe ser al menos COP 10.000.000.';
    if (d.saldoInsoluto === null || !Number.isFinite(d.saldoInsoluto) || d.saldoInsoluto <= 0)
      campos['saldo'] = 'Ingresa un saldo pendiente mayor a cero.';
    else if (
      d.valorCredito !== null &&
      Number.isFinite(d.valorCredito) &&
      d.saldoInsoluto > d.valorCredito
    )
      campos['saldo'] = 'El saldo pendiente no puede superar el monto original del crédito.';
    if (
      d.plazoMeses === null ||
      !Number.isInteger(d.plazoMeses) ||
      d.plazoMeses < 12 ||
      d.plazoMeses > 480
    )
      campos['plazo'] = 'El plazo debe estar entre 12 y 480 meses.';
    this.erroresCampo.set(campos);
    const errores = Object.values(campos);
    this.errores.set(errores);
    if (errores.length) return;
    await this.crearCotizacion({
      entidadAcreedora: this.bancoFijado() ? this.entidad() : d.entidadAcreedora.trim(),
      valorCredito: d.valorCredito!,
      saldoInsoluto: d.saldoInsoluto!,
      plazoMeses: d.plazoMeses!,
      origen: 'DECLARADO',
      fechaConsulta: null,
    });
  }
  private async crearCotizacion(datos: DatosCotizacion): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorCotizacion.set('');
    try {
      await this.cotizaciones.crear({
        entidadAcreedora: datos.entidadAcreedora,
        valorCredito: datos.valorCredito,
        saldoInsoluto: datos.saldoInsoluto,
        plazoRestanteMeses: datos.plazoMeses,
      });
      await this.router.navigateByUrl('/cuenta/cotizaciones/actual');
    } catch (error: unknown) {
      const detalle = error instanceof HttpErrorResponse ? JSON.stringify(error.error ?? '') : '';
      if (/75.años|75.añ|edad.*75|edad.*plazo|plazo.*edad|edad.*terminar/i.test(detalle)) {
        this.errorCotizacion.set(
          'El plazo del crédito supera la edad máxima de permanencia de 75 años. Revisa el plazo restante.',
        );
      } else {
        this.errorCotizacion.set('No pudimos generar tu cotización. Inténtalo nuevamente.');
      }
    } finally {
      this.enviando.set(false);
    }
  }
}
