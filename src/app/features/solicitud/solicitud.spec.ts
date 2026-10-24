import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Signal } from '@angular/core';
import { Solicitud } from './solicitud';
import { Evidencia, EvidenciasApiService, TipoEvidencia } from './evidencias-api.service';
import { PrepararImagenService } from './preparar-imagen.service';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';

interface Controles {
  subir(tipo: TipoEvidencia, archivo: File): Promise<void>;
  abrirCamara(): Promise<void>;
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
  let seleccion: {
    cotizacionCreadaEn: string;
    hogarSeleccionado: boolean;
    condicionesAceptadas: boolean;
  };

  beforeEach(() => {
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
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Location, useValue: { getState: () => seleccion } },
        { provide: EvidenciasApiService, useValue: api },
        { provide: PrepararImagenService, useValue: imagen },
        { provide: CotizacionApiService, useValue: cotizaciones },
      ],
    });
  });
  async function montar() {
    const fixture = TestBed.createComponent(Solicitud);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

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

  it('ofrece subir archivo cuando se deniega la cámara', async () => {
    api.consultar.and.resolveTo([evidencia('cedula_frente'), evidencia('cedula_reverso')]);
    spyOn(navigator.mediaDevices, 'getUserMedia').and.rejectWith(
      new DOMException('Denied', 'NotAllowedError'),
    );
    const fixture = await montar();
    await (fixture.componentInstance as unknown as Controles).abrirCamara();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Permite su uso en el navegador o sube una foto',
    );
    expect(
      fixture.nativeElement.querySelector('input[aria-label="Subir foto de tu selfie"]').disabled,
    ).toBeFalse();
  });

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
