import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SeguroDetalle } from './seguro-detalle';
import { DetallePolizaSolicitud, PolizasApiService } from './polizas-api.service';
import { plazoRenovacionAbierto } from './renovacion-poliza';
import { ResumenSiniestro, SiniestrosApiService } from '../siniestros/siniestros-api.service';

describe('SeguroDetalle BITS-104', () => {
  let api: jasmine.SpyObj<PolizasApiService>;
  let siniestrosApi: jasmine.SpyObj<SiniestrosApiService>;
  const siniestro = (
    id: string,
    polizaId: string,
    tipo: ResumenSiniestro['tipo'],
    estado: ResumenSiniestro['estado'],
    reportadoEn: string,
    automatico = false,
  ): ResumenSiniestro => ({
    id,
    numero: `SIN-${id}`,
    polizaId,
    tipo,
    estado,
    reportadoEn,
    actualizadoEn: reportadoEn,
    automatico,
  });
  const poliza: DetallePolizaSolicitud = {
    polizaId: 'p1',
    estado: 'EMITIDA',
    pendientes: [],
    moneda: 'COP',
    primaTotalMensual: 77374,
    emitidaEn: '2026-10-22T15:00:00Z',
    vigencia: { desde: '2026-10-23T05:00:00Z', hasta: '2027-10-23T05:00:00Z' },
    datosCredito: {
      entidadAcreedora: 'Bancolombia',
      valorCredito: 380000000,
      saldoInsoluto: 320000000,
      plazoRestanteMeses: 180,
    },
    coberturas: [
      {
        codigo: 'VIDA',
        obligatoria: true,
        sumaAsegurada: 320000000,
        primaNeta: 49100,
        iva: 0,
        primaTotal: 49100,
      },
      {
        codigo: 'HOGAR',
        obligatoria: false,
        sumaAsegurada: 380000000,
        primaNeta: 23760,
        iva: 4514,
        primaTotal: 28274,
      },
    ],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj('PolizasApiService', [
      'consultarDetalle',
      'documento',
      'decidirRenovacion',
    ]);
    api.consultarDetalle.and.resolveTo({ ...poliza, numero: 'SOL-104' });
    siniestrosApi = jasmine.createSpyObj('SiniestrosApiService', ['listar']);
    siniestrosApi.listar.and.resolveTo([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PolizasApiService, useValue: api },
        { provide: SiniestrosApiService, useValue: siniestrosApi },
      ],
    });
  });
  async function montar() {
    const fixture = TestBed.createComponent(SeguroDetalle);
    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  const propuesta = {
    estado: 'SIN_RESPUESTA' as const,
    primaActual: 77374,
    primaNueva: 81397,
    ipc: 0.052,
    fechaRenovacion: '2099-12-17T17:00:00Z',
    decidirHasta: '2099-11-17T17:00:00Z',
  };

  it('pide confirmar el rechazo y permite revertirlo', async () => {
    api.consultarDetalle.and.resolveTo({ ...poliza, renovacion: propuesta });
    api.decidirRenovacion.and.resolveTo({
      ...poliza,
      renovacion: { ...propuesta, estado: 'RECHAZADA' },
    });
    const fixture = await montar();
    const detalle: HTMLElement = fixture.nativeElement;
    const dialogo = detalle.querySelector('dialog')!;
    const pulsar = (contenedor: HTMLElement, texto: string) =>
      Array.from(contenedor.querySelectorAll('button'))
        .find((boton) => boton.textContent?.trim() === texto)!
        .click();

    expect(dialogo.open).toBeTrue();
    pulsar(dialogo, 'No renovar');
    fixture.detectChanges();
    expect(dialogo.querySelector('h2')?.textContent).toContain('Seguro que no quieres renovar');
    expect(api.decidirRenovacion).not.toHaveBeenCalled();
    pulsar(dialogo, 'No renovar');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.decidirRenovacion).toHaveBeenCalledOnceWith('p1', 'RECHAZAR');
    expect(dialogo.open).toBeFalse();
    expect(detalle.querySelector('.numero')?.textContent).toContain('No se renueva');

    api.decidirRenovacion.and.resolveTo({
      ...poliza,
      renovacion: { ...propuesta, estado: 'ACEPTADA' },
    });
    pulsar(detalle, 'Quiero renovarla');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.decidirRenovacion).toHaveBeenCalledWith('p1', 'ACEPTAR');
    expect(detalle.querySelector('.numero')?.textContent).toContain('Vigente');
  });

  it('cierra el plazo al inicio del día calendario del corte en Colombia', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date('2099-11-17T04:59:59Z'));
      expect(plazoRenovacionAbierto(propuesta)).toBeTrue();
      jasmine.clock().mockDate(new Date('2099-11-17T05:00:00Z'));
      expect(plazoRenovacionAbierto(propuesta)).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('muestra la vigencia anterior y permite cotizar para una póliza desactivada', async () => {
    api.consultarDetalle.and.resolveTo({ ...poliza, estado: 'DESACTIVADA' });
    const fixture = await montar();
    const detalle: HTMLElement = fixture.nativeElement;
    expect(detalle.textContent).toContain('Desactivada');
    expect(detalle.textContent).toContain('Estuvo vigente');
    expect(detalle.textContent).toContain('usa la app de Solventa');
    expect(detalle.querySelector('a[href="/cuenta/cotizaciones/nueva"]')).not.toBeNull();
  });
  it('muestra datos de la poliza, vigencia, credito y coberturas contratadas', async () => {
    const fixture = await montar();
    const texto = fixture.nativeElement.textContent;
    for (const esperado of [
      'SOL-104',
      '77.374',
      '320.000.000',
      'Bancolombia',
      '180 meses',
      'Vida para tu cr\u00e9dito',
      'Tu casa',
      '2027',
    ])
      expect(texto).toContain(esperado);
    expect(
      fixture.nativeElement.querySelector('a[href="/cuenta/solicitudes/p1/cuota"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.documento').length).toBe(1);
  });
  it('muestra generacion pendiente y permite volver a consultar el documento', async () => {
    api.documento.and.resolveTo({ estado: 'GENERANDO' });
    const fixture = await montar();
    fixture.nativeElement.querySelector('.documento button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'generando',
    );
    expect(fixture.nativeElement.querySelector('.documento button').disabled).toBeFalse();
    expect(api.documento).toHaveBeenCalledOnceWith('p1');
  });
  it('maneja el rechazo 409 de documento sin salir del detalle', async () => {
    api.documento.and.rejectWith(new HttpErrorResponse({ status: 409 }));
    const fixture = await montar();
    fixture.nativeElement.querySelector('.documento button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
  it('no navega a un enlace temporal vencido', async () => {
    api.documento.and.resolveTo({
      estado: 'LISTO',
      url: 'https://example.com/p.pdf',
      expiraEn: '2000-01-01T00:00:00Z',
    });
    const fixture = await montar();
    fixture.nativeElement.querySelector('.documento button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No pudimos abrir',
    );
  });
  it('no ofrece documentos ni seguro vigente para una solicitud pendiente', async () => {
    api.consultarDetalle.and.resolveTo({ ...poliza, estado: 'PENDIENTE' });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.documento')).toBeNull();
    expect(fixture.nativeElement.querySelector('.insignia')).toBeNull();
  });
  it('permite reintentar una consulta fallida', async () => {
    api.consultarDetalle.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    api.consultarDetalle.and.resolveTo(poliza);
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.columnas')).not.toBeNull();
  });

  it('agrupa por cobertura, filtra la póliza y ordena cada grupo del más reciente al antiguo', async () => {
    siniestrosApi.listar.and.resolveTo([
      siniestro('hogar-antiguo', 'p1', 'INCENDIO_TERREMOTO', 'RECHAZADO', '2026-08-02T10:00:00Z'),
      siniestro('ajeno', 'p2', 'INCAPACIDAD_TOTAL', 'PAGADO', '2026-12-02T10:00:00Z'),
      siniestro('vida', 'p1', 'INCAPACIDAD_TOTAL', 'PAGADO', '2026-09-03T10:00:00Z'),
      siniestro(
        'hogar-reciente',
        'p1',
        'SISMO_PARAMETRICO',
        'PAGADO',
        '2026-11-02T10:00:00Z',
        true,
      ),
      siniestro(
        'hogar-pendiente',
        'p1',
        'INCENDIO_TERREMOTO',
        'FALTA_INFORMACION',
        '2026-10-20T10:00:00Z',
      ),
    ]);
    const fixture = await montar();
    const vida = fixture.nativeElement.querySelector('#siniestros-vida').closest('section');
    const hogar = fixture.nativeElement.querySelector('#siniestros-hogar').closest('section');
    expect(vida.querySelectorAll('.lista-siniestros a').length).toBe(1);
    expect(vida.textContent).toContain('Incapacidad total');
    const filas = Array.from(hogar.querySelectorAll('.lista-siniestros a')) as HTMLAnchorElement[];
    expect(filas.map((fila) => fila.getAttribute('href'))).toEqual([
      '/cuenta/siniestros/hogar-reciente',
      '/cuenta/siniestros/hogar-pendiente',
      '/cuenta/siniestros/hogar-antiguo',
    ]);
    expect(filas[0].textContent).toContain('Automático');
    expect(filas[1].textContent).toContain('Falta información');
    expect(filas[1].textContent).not.toContain('Automático');
    expect(fixture.nativeElement.textContent).not.toContain('SIN-ajeno');
  });

  it('oculta la sección cuando esta póliza no tiene siniestros', async () => {
    siniestrosApi.listar.and.resolveTo([
      siniestro('ajeno', 'p2', 'INCAPACIDAD_TOTAL', 'PAGADO', '2026-11-02T10:00:00Z'),
    ]);
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.siniestros')).toBeNull();
    expect(fixture.nativeElement.querySelector('.error-siniestros')).toBeNull();
    expect(fixture.nativeElement.querySelector('.documento')).not.toBeNull();
  });

  it('mantiene el seguro visible y permite reintentar cuando falla la lista', async () => {
    siniestrosApi.listar.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    expect(fixture.nativeElement.textContent).toContain('SOL-104');
    expect(fixture.nativeElement.querySelector('.error-siniestros')?.textContent).toContain(
      'No pudimos consultar tus siniestros',
    );
    siniestrosApi.listar.and.resolveTo([
      siniestro('recuperado', 'p1', 'INCAPACIDAD_TOTAL', 'EN_ESTUDIO', '2026-11-02T10:00:00Z'),
    ]);
    fixture.nativeElement.querySelector('.error-siniestros button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-siniestros')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('SIN-recuperado');
    expect(siniestrosApi.listar).toHaveBeenCalledTimes(2);
  });
});
