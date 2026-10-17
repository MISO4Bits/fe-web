import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreditoHipotecario,
  CreditoHipotecarioService,
  CreditosHipotecariosRespuesta,
  EntidadFinanciera,
} from './credito-hipotecario.service';

type Paso = 'banco' | 'consultando' | 'datos' | 'manual';
type Origen = 'VERIFICADO' | 'DECLARADO';
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
  protected readonly paso = signal<Paso>('banco');
  protected readonly entidad = signal('');
  protected readonly bancoNoListado = '__OTRO__';
  protected readonly entidades = signal<EntidadFinanciera[]>([]);
  protected readonly mensaje = signal('');
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
    this.errores.set([]);
  }

  protected async continuar(): Promise<void> {
    if (!this.entidad() || this.paso() === 'consultando') return;
    this.paso.set('consultando');
    this.mensaje.set('');
    try {
      const autorizado = await this.api.tieneConsentimientoFinanciero();
      if (!autorizado) {
        this.mensaje.set(
          'No autorizaste la consulta de datos financieros. Ingresa los datos de tu crédito manualmente.',
        );
        this.usarManual();
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
      this.mensaje.set(
        respuesta.estado === 'SIN_CONSENTIMIENTO'
          ? 'No hay autorización vigente para consultar datos financieros. Puedes ingresarlos manualmente.'
          : respuesta.estado === 'SIN_HIPOTECAS'
            ? 'No encontramos un crédito hipotecario para esta entidad.'
            : 'No fue posible obtener los datos de este banco. Puedes reintentar o ingresarlos manualmente.',
      );
      this.paso.set('manual');
      this.manual.entidadAcreedora = this.entidad();
    } catch (error: unknown) {
      const expired = error instanceof Error && error.message === 'SESION_EXPIRADA';
      this.mensaje.set(
        expired
          ? 'Tu sesión ha expirado. Vuelve a iniciar sesión para consultar el banco.'
          : 'No pudimos consultar el banco en este momento. Puedes reintentar o ingresar los datos manualmente.',
      );
      this.manual.entidadAcreedora = this.entidad();
      this.paso.set('manual');
    }
  }

  protected usarManual(): void {
    this.manual.entidadAcreedora = this.entidad();
    this.manual.valorCredito = null;
    this.manual.saldoInsoluto = null;
    this.manual.plazoMeses = null;
    this.errores.set([]);
    this.paso.set('manual');
  }

  protected bancoFijado(): boolean {
    return this.entidad().length > 0;
  }

  protected volver(): void {
    this.paso.set('banco');
    this.mensaje.set('');
  }

  protected guardarVerificado(): void {
    const credito = this.credito();
    if (!credito) return;
    this.guardado.set({
      entidadAcreedora: credito.entidadNombre,
      valorCredito: credito.valorCredito,
      saldoInsoluto: credito.saldoInsoluto,
      plazoMeses: credito.plazoRestanteMeses,
      origen: 'VERIFICADO',
      fechaConsulta: this.consultado()?.fechaConsulta ?? null,
    });
  }

  protected guardarManual(): void {
    const d = this.manual;
    const errores: string[] = [];
    if (d.entidadAcreedora.trim().length < 2 || d.entidadAcreedora.trim().length > 80)
      errores.push('Ingresa una entidad acreedora válida (2 a 80 caracteres).');
    if (d.valorCredito === null || !Number.isFinite(d.valorCredito) || d.valorCredito < 10000000)
      errores.push('El valor del crédito debe ser al menos COP 10.000.000.');
    if (d.saldoInsoluto === null || !Number.isFinite(d.saldoInsoluto) || d.saldoInsoluto <= 0)
      errores.push('Ingresa un saldo pendiente mayor a cero.');
    if (
      d.plazoMeses === null ||
      !Number.isInteger(d.plazoMeses) ||
      d.plazoMeses < 12 ||
      d.plazoMeses > 480
    )
      errores.push('El plazo debe estar entre 12 y 480 meses.');
    this.errores.set(errores);
    if (errores.length) return;
    this.guardado.set({
      entidadAcreedora: this.bancoFijado() ? this.entidad() : d.entidadAcreedora.trim(),
      valorCredito: d.valorCredito!,
      saldoInsoluto: d.saldoInsoluto!,
      plazoMeses: d.plazoMeses!,
      origen: 'DECLARADO',
      fechaConsulta: null,
    });
  }
}
