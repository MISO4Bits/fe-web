import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import {
  Evidencia,
  EvidenciasApiService,
  MotivoEvidencia,
  TipoEvidencia,
} from './evidencias-api.service';
import { PrepararImagenService } from './preparar-imagen.service';
import { SeleccionCotizacion, seleccionVigente } from './seleccion-cotizacion';

interface Foto extends Evidencia {
  ocupada: boolean;
  nombre: string;
  error: string;
  vistaPrevia: string;
}
const inicial = (tipo: TipoEvidencia): Foto => ({
  tipo,
  estado: 'PENDIENTE',
  intentosRestantes: 3,
  ocupada: false,
  nombre: '',
  error: '',
  vistaPrevia: '',
});
const lista = (foto: Foto): boolean =>
  !foto.ocupada && (foto.estado === 'ACEPTADA' || foto.estado === 'REVISION_MANUAL');

@Component({
  selector: 'app-solicitud',
  imports: [RouterLink],
  templateUrl: './solicitud.html',
  styleUrl: './solicitud.scss',
})
export class Solicitud implements OnInit, OnDestroy {
  private readonly api = inject(EvidenciasApiService);
  private readonly cotizaciones = inject(CotizacionApiService);
  private readonly preparar = inject(PrepararImagenService);
  private readonly location = inject(Location);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private destruido = false;
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly cotizacion = signal<CotizacionRespuesta | null>(null);
  protected readonly seleccion = signal<SeleccionCotizacion | null>(null);
  protected readonly fotos = signal<Record<TipoEvidencia, Foto>>({
    cedula_frente: inicial('cedula_frente'),
    cedula_reverso: inicial('cedula_reverso'),
    selfie: inicial('selfie'),
  });
  protected readonly caras = [
    { tipo: 'cedula_frente' as const, titulo: 'Frente de tu cédula' },
    { tipo: 'cedula_reverso' as const, titulo: 'Reverso de tu cédula' },
  ];
  protected readonly requisitos = [...this.caras, { tipo: 'selfie' as const, titulo: 'Tu selfie' }];
  protected readonly cedulaLista = computed(
    () => lista(this.fotos().cedula_frente) && lista(this.fotos().cedula_reverso),
  );
  protected readonly todoListo = computed(() => this.cedulaLista() && lista(this.fotos().selfie));
  protected readonly camaraActiva = signal(false);
  protected readonly pidiendoCamara = signal(false);
  protected readonly errorCamara = signal('');
  protected readonly moneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    void this.cargar();
  }
  ngOnDestroy(): void {
    this.destruido = true;
    this.cerrarCamara();
    for (const foto of Object.values(this.fotos())) {
      if (foto.vistaPrevia) URL.revokeObjectURL(foto.vistaPrevia);
    }
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const actual = await this.cotizaciones.actual();
      if (!actual || actual.estado !== 'VIGENTE') throw new Error('SIN_COTIZACION');
      const seleccion = seleccionVigente(this.location.getState(), actual);
      if (!seleccion) throw new Error('SIN_SELECCION');
      this.cotizacion.set(actual);
      this.seleccion.set(seleccion);
      const evidencias = await this.api.consultar();
      if (this.destruido) return;
      for (const evidencia of evidencias) {
        this.actualizar(evidencia.tipo, {
          ...evidencia,
          nombre: evidencia.estado === 'PENDIENTE' ? '' : 'Foto cargada',
        });
      }
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error && ['SIN_COTIZACION', 'SIN_SELECCION'].includes(error.message)
          ? 'Vuelve a tu cotización y acepta las condiciones para continuar.'
          : 'No pudimos consultar tu solicitud. Inténtalo de nuevo.',
      );
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }

  private actualizar(tipo: TipoEvidencia, cambios: Partial<Foto>): void {
    this.fotos.update((fotos) => ({ ...fotos, [tipo]: { ...fotos[tipo], ...cambios } }));
  }

  protected elegir(tipo: TipoEvidencia, event: Event): void {
    if (tipo === 'selfie') return;
    const input = event.target as HTMLInputElement;
    const foto = input.files?.[0];
    input.value = '';
    if (foto) void this.subir(tipo, foto);
  }

  protected soltar(tipo: TipoEvidencia, event: DragEvent): void {
    event.preventDefault();
    if (tipo === 'selfie') return;
    if (event.dataTransfer?.files.length !== 1) {
      this.actualizar(tipo, { error: 'Selecciona una sola foto JPG o PNG.' });
      return;
    }
    void this.subir(tipo, event.dataTransfer.files[0]);
  }

  private async subir(tipo: TipoEvidencia, archivo: File): Promise<void> {
    if (this.fotos()[tipo].ocupada || (tipo === 'selfie' && !this.cedulaLista())) return;
    if (tipo !== 'selfie') this.cerrarCamara();
    this.actualizar(tipo, { ocupada: true, error: '' });
    let enviada = false;
    try {
      const imagen = await this.preparar.preparar(archivo);
      if (this.destruido) return;
      const anterior = this.fotos()[tipo].vistaPrevia;
      const vistaPrevia = URL.createObjectURL(imagen);
      this.actualizar(tipo, {
        vistaPrevia,
        nombre: archivo.name,
        estado: 'PENDIENTE',
      });
      if (anterior) URL.revokeObjectURL(anterior);
      enviada = true;
      const resultado = await this.api.subir(tipo, imagen);
      if (!this.destruido) this.actualizar(tipo, { ...resultado, nombre: archivo.name, error: '' });
    } catch (error: unknown) {
      if (this.destruido) return;
      let mensaje = 'No pudimos enviar la foto. Revisa tu conexión y vuelve a seleccionarla.';
      if (!enviada && error instanceof Error) mensaje = error.message;
      if (error instanceof HttpErrorResponse) {
        if (error.status === 413) mensaje = 'La foto es demasiado grande. Selecciona otra imagen.';
        if (error.status === 401)
          mensaje = 'Tu sesión expiró. Inicia sesión de nuevo para cargar la foto.';
        if (error.status === 415 || error.status === 422)
          mensaje = 'No pudimos procesar la foto. Selecciona otra imagen JPG o PNG.';
      }
      this.actualizar(tipo, { error: mensaje });
    } finally {
      if (!this.destruido) this.actualizar(tipo, { ocupada: false });
    }
  }

  protected texto(foto: Foto): string {
    if (foto.ocupada) return 'La estamos revisando...';
    if (foto.estado === 'ACEPTADA') return 'Se ve bien';
    if (foto.estado === 'REVISION_MANUAL') return 'La revisará una persona. Puedes seguir.';
    if (foto.estado !== 'REINTENTAR') return 'Falta';
    const motivos: Record<MotivoEvidencia, string> = {
      BORROSA: 'está borrosa',
      OSCURA: 'está muy oscura',
      REFLEJO: 'tiene reflejos',
      RECORTADA: 'no se ven las cuatro esquinas',
      NO_ES_CEDULA: 'no parece una cédula',
      SIN_ROSTRO: 'no se ve tu rostro',
      VARIOS_ROSTROS: 'aparece más de un rostro',
      POSIBLE_SUPLANTACION: 'no pudimos verificar que seas tú',
      NO_COINCIDE_CON_CEDULA: 'no coincide con tu cédula',
    };
    return `Mejor otra foto: ${foto.motivo ? motivos[foto.motivo] : 'no pudimos validarla'}. Te quedan ${foto.intentosRestantes} intentos.`;
  }

  protected accion(foto: Foto): string {
    return foto.estado === 'ACEPTADA'
      ? 'Reemplazar la foto'
      : foto.estado === 'PENDIENTE'
        ? 'Buscar la foto'
        : 'Cargar otra foto';
  }

  protected async abrirCamara(): Promise<void> {
    if (
      !this.cedulaLista() ||
      this.fotos().selfie.ocupada ||
      this.pidiendoCamara() ||
      this.camaraActiva()
    )
      return;
    this.errorCamara.set('');
    this.pidiendoCamara.set(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('SIN_CAMARA');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (this.destruido || !this.cedulaLista()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const video = this.video()?.nativeElement;
      if (!video) throw new Error('SIN_CAMARA');
      video.srcObject = stream;
      this.camaraActiva.set(true);
      await video.play();
    } catch {
      this.cerrarCamara();
      if (!this.destruido)
        this.errorCamara.set(
          'No pudimos activar la cámara. Revisa que tu equipo tenga una cámara disponible y permite su uso en el navegador para tomar la selfie.',
        );
    } finally {
      if (!this.destruido) this.pidiendoCamara.set(false);
    }
  }

  protected cerrarCamara(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    const video = this.video()?.nativeElement;
    if (video) video.srcObject = null;
    this.camaraActiva.set(false);
  }

  protected async capturar(): Promise<void> {
    const video = this.video()?.nativeElement;
    if (!video?.videoWidth || !this.cedulaLista() || this.fotos().selfie.ocupada) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) return;
    contexto.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    this.cerrarCamara();
    if (blob && !this.destruido)
      await this.subir('selfie', new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
  }

  protected get vida(): number {
    const c = this.cotizacion();
    return (
      c?.oferta.desglose?.coberturas.find((cobertura) => cobertura.codigo === 'VIDA')?.primaTotal ??
      c?.oferta.primaMensual ??
      0
    );
  }
  protected get hogar() {
    return this.seleccion()?.hogarSeleccionado
      ? this.cotizacion()?.oferta.desglose?.coberturas.find((c) => c.codigo === 'HOGAR')
      : undefined;
  }
  protected get total(): number {
    return this.vida + (this.hogar?.primaTotal ?? 0);
  }
  protected get datosCredito(): string {
    const c = this.cotizacion();
    return (c?.origenDatos as string) === 'OPEN_FINANCE'
      ? `Confirmados por ${c?.datosCredito.entidadAcreedora}`
      : 'Declarado por el solicitante';
  }
}
