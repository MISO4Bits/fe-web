import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Signal } from '@angular/core';
import { Solicitud } from './solicitud';
import { DocumentoAceptado, PolizasApiService, PolizaSolicitud } from './polizas-api.service';
import { Evidencia, EvidenciasApiService, TipoEvidencia } from './evidencias-api.service';
import { PrepararImagenService } from './preparar-imagen.service';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';

interface Controles {
  enviar(): Promise<void>;
  subir(tipo: TipoEvidencia, archivo: File): Promise<void>;
  abrirCamara(): Promise<void>;
  capturar(): Promise<void>;
  elegir(tipo: TipoEvidencia, event: Event): void;
  soltar(tipo: TipoEvidencia, event: DragEvent): void;
  cedulaLista: Signal<boolean>;
  todoListo: Signal<boolean>;
}
describe('Solicitud BITS-275', () => {
  const cotizacion: CotizacionRespuesta = {
    estado: 'VIGENTE',
    producto: 'VIDA_HIPOTECARIO',
    origenDatos: 'DECLARADO',
    datosCredito: {
      entidadAcreedora: 'BBVA',
      valorCredito: 200000000,
      saldoInsoluto: 100000000,
      plazoRestanteMeses: 120,
    },
    oferta: {
      primaMensual: 40000,
      primaBaseMensual: 40000,
      sumaAsegurada: 100000000,
      coberturaMeses: 120,
      moneda: 'COP',
      personalizado: false,
      desglose: {
        coberturas: [
          {
            codigo: 'VIDA',
            obligatoria: true,
            sumaAsegurada: 100000000,
            primaNeta: 40000,
            iva: 0,
            primaTotal: 40000,
          },
          {
            codigo: 'HOGAR',
            obligatoria: false,
            sumaAsegurada: 200000000,
            primaNeta: 10000,
            iva: 1900,
            primaTotal: 11900,
          },
        ],
      },
    },
    creadaEn: '2026-10-23T10:00:00Z',
    vigenciaCotizacion: { desde: '2026-10-23', hasta: '2026-11-23' },
  };
  const archivo = new File(['foto'], 'frente.png', { type: 'image/png' });
  const evidencia = (tipo: TipoEvidencia, estado: Evidencia['estado'] = 'ACEPTADA'): Evidencia => ({
    tipo,
    estado,
    intentosRestantes: 2,
  });
  let api: jasmine.SpyObj<EvidenciasApiService>;
  let imagen: jasmine.SpyObj<PrepararImagenService>;
  let cotizaciones: jasmine.SpyObj<CotizacionApiService>;
  let polizas: jasmine.SpyObj<PolizasApiService>;
  let seleccion: {
    cotizacionCreadaEn: string;
    hogarSeleccionado: boolean;
    condicionesAceptadas: boolean;
    documentosAceptados?: DocumentoAceptado[];
  };

  beforeEach(() => {
    polizas = jasmine.createSpyObj('PolizasApiService', ['solicitar']);
    polizas.solicitar.and.resolveTo({ polizaId: 'p1', estado: 'EMITIDA', pendientes: [] });
    api = jasmine.createSpyObj('EvidenciasApiService', ['consultar', 'subir']);
    api.consultar.and.resolveTo([]);
    api.subir.and.callFake(async (tipo) => evidencia(tipo));
    imagen = jasmine.createSpyObj('PrepararImagenService', ['preparar']);
    imagen.preparar.and.resolveTo(archivo);
    cotizaciones = jasmine.createSpyObj('CotizacionApiService', ['actual']);
    cotizaciones.actual.and.resolveTo(cotizacion);
    seleccion = {
      cotizacionCreadaEn: cotizacion.creadaEn,
      hogarSeleccionado: false,
      condicionesAceptadas: true,
      documentosAceptados: [{ tipo: 'poliza', version: 'V1' }],
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PolizasApiService, useValue: polizas },
        { provide: Location, useValue: { getState: () => seleccion } },
        { provide: EvidenciasApiService, useValue: api },
        { provide: PrepararImagenService, useValue: imagen },
        { provide: CotizacionApiService, useValue: cotizaciones },
      ],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  async function montar() {
    const fixture = TestBed.createComponent(Solicitud);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  for (const hogar of [false, true]) {
    it(`envía la selección ${hogar ? 'VIDA y HOGAR' : 'VIDA'} y abre el estado de la solicitud`, async () => {
      seleccion.hogarSeleccionado = hogar;
      api.consultar.and.resolveTo([
        evidencia('cedula_frente'),
        evidencia('cedula_reverso'),
        evidencia('selfie', 'REVISION_MANUAL'),
      ]);
      const fixture = await montar();
      fixture.nativeElement.querySelector('.enviar').click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(polizas.solicitar).toHaveBeenCalledOnceWith({
        coberturas: hogar ? ['VIDA', 'HOGAR'] : ['VIDA'],
        cotizacionCreadaEn: cotizacion.creadaEn,
        documentosAceptados: [{ tipo: 'poliza', version: 'V1' }],
      });
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledOnceWith([
        '/cuenta/solicitudes',
        'p1',
      ]);
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
        'Tu solicitud de cambio de seguro',
      );
      expect(fixture.nativeElement.querySelectorAll('.caras .foto').length).toBe(2);
      expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.enviar').textContent).toContain(
        'Solicitud enviada',
      );
      await (fixture.componentInstance as unknown as Controles).enviar();
      expect(polizas.solicitar).toHaveBeenCalledTimes(1);
    });
  }

  it('no envía mientras falten evidencias', async () => {
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).enviar();
    expect(polizas.solicitar).not.toHaveBeenCalled();
  });

  it('bloquea solicitudes simultáneas y conserva la respuesta pendiente sin reemplazar la pantalla', async () => {
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso'),
      evidencia('selfie'),
    ]);
    let resolver!: (respuesta: PolizaSolicitud) => void;
    polizas.solicitar.and.returnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    const envio = controles.enviar();
    await controles.enviar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
    expect(polizas.solicitar).toHaveBeenCalledTimes(1);
    resolver({
      polizaId: 'p1',
      estado: 'PENDIENTE',
      pendientes: [{ codigo: 'EVIDENCIA_EN_REVISION', tipo: 'AGENTE', mensaje: 'Revisión manual' }],
    });
    await envio;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.requisitos')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
  });

  it('conserva fotos y selección si falla el registro y permite reintentar', async () => {
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso'),
      evidencia('selfie'),
    ]);
    polizas.solicitar.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.enviar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tus fotos siguen cargadas');
    expect(controles.todoListo()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeFalse();
    polizas.solicitar.and.resolveTo({ polizaId: 'p1', estado: 'EMITIDA', pendientes: [] });
    await controles.enviar();
    expect(polizas.solicitar).toHaveBeenCalledTimes(2);
    expect(polizas.solicitar.calls.argsFor(0)).toEqual(polizas.solicitar.calls.argsFor(1));
    expect(api.consultar).toHaveBeenCalledTimes(1);
    expect(api.subir).not.toHaveBeenCalled();
  });

  it('bloquea reenvíos y pide revisar la cotización ante HTTP 409', async () => {
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso'),
      evidencia('selfie'),
    ]);
    polizas.solicitar.and.rejectWith(new HttpErrorResponse({ status: 409 }));
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.enviar();
    await controles.enviar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tu cotización venció o cambió');
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
    expect(polizas.solicitar).toHaveBeenCalledTimes(1);
  });

  it('no registra una solicitud sin la versión de las condiciones aceptadas', async () => {
    seleccion.documentosAceptados = undefined;
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso'),
      evidencia('selfie'),
    ]);
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).enviar();
    fixture.detectChanges();
    expect(polizas.solicitar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('acepta las condiciones');
  });

  it('empieza sin fotos, con selfie y envío deshabilitados y crédito declarado', async () => {
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.selfie .boton').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Declarado por el solicitante');
    expect(fixture.nativeElement.querySelector('.resumen').textContent).not.toContain('Tu casa');
  });

  it('conserva Tu casa y los importes de la cotización aceptada', async () => {
    seleccion.hogarSeleccionado = true;
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.resumen').textContent).toContain('Tu casa');
    expect(fixture.nativeElement.querySelector('.total').textContent).toContain('51.900');
  });

  it('muestra la confirmación del banco cuando origenDatos es CONFIRMADO', async () => {
    cotizaciones.actual.and.resolveTo({ ...cotizacion, origenDatos: 'CONFIRMADO' });
    const fixture = await montar();
    expect(fixture.nativeElement.textContent).toContain('Confirmados por BBVA');
    expect(fixture.nativeElement.textContent).not.toContain('Declarado por el solicitante');
  });

  it('restaura revisión manual y aceptada, habilita selfie y después envío sin enviar solicitud', async () => {
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso', 'REVISION_MANUAL'),
    ]);
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    expect(controles.cedulaLista()).toBeTrue();
    expect(controles.todoListo()).toBeFalse();
    await controles.subir('selfie', archivo);
    fixture.detectChanges();
    expect(controles.todoListo()).toBeTrue();
    const enviar = fixture.nativeElement.querySelector('.enviar') as HTMLButtonElement;
    expect(enviar.disabled).toBeFalse();
    enviar.click();
    expect(api.subir).toHaveBeenCalledTimes(1);
    expect(api.subir).toHaveBeenCalledWith('selfie', archivo);
  });

  it('rechaza un formato inválido localmente sin enviar ni perder la otra cara', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente')]);
    imagen.preparar.and.rejectWith(new Error('Selecciona una foto JPG o PNG.'));
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).subir('cedula_reverso', archivo);
    fixture.detectChanges();
    expect(api.subir).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'JPG o PNG',
    );
    expect(fixture.nativeElement.querySelector('.caras .foto').textContent).toContain('Se ve bien');
  });

  it('muestra motivo e intentos del backend y acepta la revisión manual del tercer rechazo', async () => {
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    api.subir.and.resolveTo({
      ...evidencia('cedula_reverso', 'REINTENTAR'),
      motivo: 'BORROSA',
      intentosRestantes: 1,
    });
    await controles.subir('cedula_reverso', archivo);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('está borrosa. Te quedan 1 intentos');
    expect(controles.cedulaLista()).toBeFalse();
    api.subir.and.resolveTo({
      ...evidencia('cedula_reverso', 'REVISION_MANUAL'),
      intentosRestantes: 0,
    });
    await controles.subir('cedula_reverso', archivo);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La revisará una persona. Puedes seguir.');
  });

  it('no reintenta automáticamente una subida fallida y permite otra selección', async () => {
    api.subir.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.subir('cedula_frente', archivo);
    fixture.detectChanges();
    expect(api.subir).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Revisa tu conexión',
    );
    api.subir.and.resolveTo(evidencia('cedula_frente'));
    await controles.subir('cedula_frente', archivo);
    expect(api.subir).toHaveBeenCalledTimes(2);
  });

  it('no accede sin las condiciones aceptadas o con selección de otra cotización', async () => {
    seleccion.cotizacionCreadaEn = 'otra';
    const fixture = await montar();
    expect(fixture.nativeElement.textContent).toContain('Vuelve a tu cotización');
    expect(api.consultar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.enviar')).toBeNull();
  });

  it('no admite selfie antes de resolver ambas caras', async () => {
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).subir('selfie', archivo);
    expect(api.subir).not.toHaveBeenCalled();
    expect(imagen.preparar).not.toHaveBeenCalled();
  });

  it('muestra las miniaturas de la cédula y selfie usando las imágenes preparadas', async () => {
    const crearUrl = spyOn(URL, 'createObjectURL').and.returnValues(
      'blob:frente',
      'blob:reverso',
      'blob:selfie',
    );
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.subir('cedula_frente', archivo);
    await controles.subir('cedula_reverso', archivo);
    await controles.subir('selfie', archivo);
    fixture.detectChanges();
    const caras = fixture.nativeElement.querySelectorAll(
      '.miniatura-cedula',
    ) as NodeListOf<HTMLImageElement>;
    expect(caras.length).toBe(2);
    expect(caras[0].getAttribute('src')).toBe('blob:frente');
    expect(caras[1].getAttribute('src')).toBe('blob:reverso');
    expect(fixture.nativeElement.querySelector('.miniatura-selfie').getAttribute('src')).toBe(
      'blob:selfie',
    );
    expect(fixture.nativeElement.querySelector('.retrato svg')).toBeNull();
    expect(crearUrl).toHaveBeenCalledWith(archivo);
  });

  it('conserva la miniatura con un archivo inválido y libera las URLs al reemplazar o salir', async () => {
    spyOn(URL, 'createObjectURL').and.returnValues('blob:primera', 'blob:segunda');
    const revocar = spyOn(URL, 'revokeObjectURL');
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.subir('cedula_frente', archivo);
    imagen.preparar.and.rejectWith(new Error('Selecciona una foto JPG o PNG.'));
    await controles.subir('cedula_frente', archivo);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.miniatura-cedula').getAttribute('src')).toBe(
      'blob:primera',
    );
    expect(revocar).not.toHaveBeenCalled();
    imagen.preparar.and.resolveTo(archivo);
    await controles.subir('cedula_frente', archivo);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.miniatura-cedula').getAttribute('src')).toBe(
      'blob:segunda',
    );
    expect(revocar).toHaveBeenCalledOnceWith('blob:primera');
    fixture.destroy();
    expect(revocar).toHaveBeenCalledWith('blob:segunda');
  });

  it('pide habilitar la cámara sin ofrecer archivos cuando se deniega el permiso', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente'), evidencia('cedula_reverso')]);
    spyOn(navigator.mediaDevices, 'getUserMedia').and.rejectWith(
      new DOMException('Denied', 'NotAllowedError'),
    );
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).abrirCamara();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'permite su uso en el navegador para tomar la selfie',
    );
    expect(fixture.nativeElement.querySelector('.selfie input[type="file"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.selfie .boton').disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
  });

  it('no permite seleccionar ni arrastrar un archivo para la selfie', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente'), evidencia('cedula_reverso')]);
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    const archivos = new DataTransfer();
    archivos.items.add(archivo);
    const input = document.createElement('input');
    input.type = 'file';
    input.files = archivos.files;
    const cambio = new Event('change');
    input.addEventListener('change', (event) => controles.elegir('selfie', event));
    input.dispatchEvent(cambio);
    const drop = new DragEvent('drop', { dataTransfer: archivos, cancelable: true, bubbles: true });
    fixture.nativeElement.querySelector('.selfie').dispatchEvent(drop);
    controles.soltar('selfie', new DragEvent('drop', { dataTransfer: archivos, cancelable: true }));
    await fixture.whenStable();
    expect(drop.defaultPrevented).toBeTrue();
    expect(imagen.preparar).not.toHaveBeenCalled();
    expect(api.subir).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.selfie input[type="file"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.caras input[type="file"]').length).toBe(2);
  });

  it('captura la selfie con cámara, la envía y libera el dispositivo', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente'), evidencia('cedula_reverso')]);
    const stream = new MediaStream();
    const stop = jasmine.createSpy('stop');
    spyOn(stream, 'getTracks').and.returnValue([{ stop } as unknown as MediaStreamTrack]);
    const permiso = spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(stream);
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    spyOn(video, 'play').and.resolveTo();
    Object.defineProperty(video, 'videoWidth', { value: 320 });
    Object.defineProperty(video, 'videoHeight', { value: 240 });
    spyOn(CanvasRenderingContext2D.prototype, 'drawImage').and.stub();
    await controles.abrirCamara();
    fixture.detectChanges();
    expect(video.srcObject).toBe(stream);
    expect(video.hidden).toBeFalse();
    await controles.abrirCamara();
    expect(permiso).toHaveBeenCalledTimes(1);
    await controles.capturar();
    fixture.detectChanges();
    expect(imagen.preparar).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'selfie.jpg', type: 'image/jpeg' }),
    );
    expect(api.subir).toHaveBeenCalledWith('selfie', archivo);
    expect(video.srcObject).toBeNull();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.miniatura-selfie')).not.toBeNull();
    expect(controles.todoListo()).toBeTrue();
  });

  it('no captura sin cámara lista y no pide permiso antes de cargar ambas caras', async () => {
    const permiso = spyOn(navigator.mediaDevices, 'getUserMedia');
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    await controles.abrirCamara();
    await controles.capturar();
    expect(permiso).not.toHaveBeenCalled();
    expect(api.subir).not.toHaveBeenCalled();
  });

  it('maneja carga por selector y arrastre, y rechaza múltiples archivos', async () => {
    const fixture = await montar();
    const controles = fixture.componentInstance as unknown as Controles;
    const input = fixture.nativeElement.querySelector('.caras input') as HTMLInputElement;
    const archivos = new DataTransfer();
    archivos.items.add(archivo);
    input.files = archivos.files;
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(api.subir).toHaveBeenCalledWith('cedula_frente', archivo);
    const arrastradas = new DataTransfer();
    arrastradas.items.add(archivo);
    const drop = new DragEvent('drop', { dataTransfer: arrastradas, cancelable: true });
    controles.soltar('cedula_reverso', drop);
    await fixture.whenStable();
    expect(drop.defaultPrevented).toBeTrue();
    expect(api.subir).toHaveBeenCalledWith('cedula_reverso', archivo);
    arrastradas.items.add(new File(['otra'], 'otra.png', { type: 'image/png' }));
    controles.soltar('cedula_reverso', new DragEvent('drop', { dataTransfer: arrastradas }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Selecciona una sola foto');
    expect(api.subir).toHaveBeenCalledTimes(2);
  });

  for (const [status, mensaje] of [
    [401, 'Tu sesión expiró'],
    [413, 'demasiado grande'],
    [415, 'otra imagen JPG o PNG'],
    [422, 'otra imagen JPG o PNG'],
  ] as const) {
    it(`explica el error HTTP ${status} sin repetir la subida`, async () => {
      api.subir.and.rejectWith(new HttpErrorResponse({ status }));
      const fixture = await montar();
      await (fixture.componentInstance as unknown as Controles).subir('cedula_frente', archivo);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(mensaje);
      expect(api.subir).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeTrue();
    });
  }

  it('permite recuperar una consulta de evidencias que falló', async () => {
    api.consultar.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar tu solicitud');
    api.consultar.and.resolveTo([
      evidencia('cedula_frente'),
      evidencia('cedula_reverso'),
      evidencia('selfie'),
    ]);
    (fixture.nativeElement.querySelector('.boton') as HTMLButtonElement).click();
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.enviar').disabled).toBeFalse();
    expect(api.consultar).toHaveBeenCalledTimes(2);
  });

  for (const actual of [null, { ...cotizacion, estado: 'EXPIRADA' as const }]) {
    it(`impide usar una cotización ${actual ? 'expirada' : 'inexistente'}`, async () => {
      cotizaciones.actual.and.resolveTo(actual);
      const fixture = await montar();
      expect(fixture.nativeElement.textContent).toContain('Vuelve a tu cotización');
      expect(api.consultar).not.toHaveBeenCalled();
    });
  }

  it('detiene una cámara cuyo permiso se resuelve después de abandonar la pantalla', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente'), evidencia('cedula_reverso')]);
    let resolver!: (stream: MediaStream) => void;
    spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    const stop = jasmine.createSpy('stop');
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const fixture = await montar();
    const pendiente = (fixture.componentInstance as unknown as Controles).abrirCamara();
    fixture.destroy();
    resolver(stream);
    await pendiente;
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
