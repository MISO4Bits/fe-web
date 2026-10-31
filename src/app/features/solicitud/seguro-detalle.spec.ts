import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SeguroDetalle } from './seguro-detalle';
import { DetallePolizaSolicitud, PolizasApiService } from './polizas-api.service';

describe('SeguroDetalle BITS-104', () => {
  let api: jasmine.SpyObj<PolizasApiService>;
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
    api = jasmine.createSpyObj('PolizasApiService', ['consultarDetalle', 'documento']);
    api.consultarDetalle.and.resolveTo({ ...poliza, numero: 'SOL-104' });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PolizasApiService, useValue: api }],
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
});
