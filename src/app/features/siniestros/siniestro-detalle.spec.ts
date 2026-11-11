import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DetallePolizaSolicitud, PolizasApiService } from '../solicitud/polizas-api.service';
import { Siniestro, SiniestrosApiService } from './siniestros-api.service';
import { SiniestroDetalle } from './siniestro-detalle';

describe('SiniestroDetalle BITS-302', () => {
  let api: jasmine.SpyObj<SiniestrosApiService>;
  let polizas: jasmine.SpyObj<PolizasApiService>;
  const base: Siniestro = {
    id: 's1',
    numero: 'SIN-2026-00042',
    polizaId: 'p1',
    tipo: 'INCENDIO_TERREMOTO',
    automatico: false,
    estado: 'EN_ESTUDIO',
    reportadoEn: '2026-11-02T15:00:00Z',
    actualizadoEn: '2026-11-02T15:00:00Z',
    fechaOcurrencia: '2026-11-02',
    narracion: 'Se prendió la estufa',
    ultimaEntregaEn: '2026-11-02T15:00:00Z',
    fechaLimite: '2026-12-02T15:00:00Z',
    archivos: [
      { id: 'a1', clase: 'FOTO', entregadoEn: '2026-11-02T15:00:00Z' },
      { id: 'a2', clase: 'DOCUMENTO', entregadoEn: '2026-11-02T15:00:00Z' },
    ],
  };
  const poliza: DetallePolizaSolicitud = {
    polizaId: 'p1',
    numero: 'POL-1',
    estado: 'EMITIDA',
    pendientes: [],
    moneda: 'COP',
    primaTotalMensual: 1,
    coberturas: [
      {
        codigo: 'HOGAR',
        obligatoria: false,
        sumaAsegurada: 1000000,
        primaNeta: 1,
        iva: 0,
        primaTotal: 1,
      },
    ],
    datosCredito: {
      entidadAcreedora: 'Bancolombia',
      valorCredito: 1000000,
      saldoInsoluto: 500000,
      plazoRestanteMeses: 12,
    },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj('SiniestrosApiService', ['consultar']);
    polizas = jasmine.createSpyObj('PolizasApiService', ['consultarDetalle']);
    api.consultar.and.resolveTo(base);
    polizas.consultarDetalle.and.resolveTo(poliza);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SiniestrosApiService, useValue: api },
        { provide: PolizasApiService, useValue: polizas },
      ],
    });
  });

  async function montar() {
    const fixture = TestBed.createComponent(SiniestroDetalle);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    return fixture;
  }

  it('muestra plazo, reporte y póliza en estudio, sin medio de pago', async () => {
    const fixture = await montar();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('SIN-2026-00042');
    expect(texto).toContain('2 de dic de 2026');
    expect(texto).toContain('Se prendió la estufa');
    expect(texto).toContain('1 foto y 1 documento');
    expect(texto).toContain('POL-1');
    expect(texto).not.toContain('Transferencia');
    expect(polizas.consultarDetalle).toHaveBeenCalledOnceWith('p1');
  });

  it('mantiene visible el siniestro si falla la consulta de póliza', async () => {
    polizas.consultarDetalle.and.rejectWith(new HttpErrorResponse({ status: 503 }));
    const fixture = await montar();
    expect(fixture.nativeElement.textContent).toContain('SIN-2026-00042');
    expect(fixture.nativeElement.querySelector('.poliza')).toBeNull();
  });

  it('muestra un solo pendiente y oculta el plazo en falta información', async () => {
    api.consultar.and.resolveTo({
      ...base,
      estado: 'FALTA_INFORMACION',
      fechaLimite: null,
      evidenciaPedida: { detalle: 'Envía una foto', pedidaEn: '2026-11-03T15:00:00Z' },
    });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelectorAll('.pendientes > p').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Envía una foto');
    expect(fixture.nativeElement.textContent).not.toContain('Te respondemos a más tardar');
  });

  it('muestra todas las líneas del pago y el sismo automático sin reporte manual', async () => {
    api.consultar.and.resolveTo({
      ...base,
      tipo: 'SISMO_PARAMETRICO',
      automatico: true,
      estado: 'PAGADO',
      evento: { fecha: '2026-11-02', municipio: 'Bogotá', magnitud: 6.1 },
      pago: {
        pagadoEn: '2026-11-02T15:00:00Z',
        lineas: [
          { beneficiario: 'BANCO', valor: 1000000, destino: 'Abono al crédito' },
          { beneficiario: 'CLIENTE', valor: 250000, destino: 'Cuenta terminada en 4821' },
        ],
      },
    });
    const fixture = await montar();
    const texto = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelectorAll('.pago-linea').length).toBe(2);
    expect(texto).toContain('Abono al crédito');
    expect(texto).toContain('Cuenta terminada en 4821');
    expect(texto).toContain('Bogotá');
    expect(texto).not.toContain('Lo que reportaste');
  });
});
