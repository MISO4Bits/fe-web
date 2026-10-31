import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SeguroCuota } from './seguro-cuota';
import { DetallePolizaSolicitud, PolizasApiService } from './polizas-api.service';

describe('SeguroCuota BITS-102', () => {
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
    api = jasmine.createSpyObj('PolizasApiService', ['consultarDetalle']);
    api.consultarDetalle.and.resolveTo(poliza);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PolizasApiService, useValue: api }],
    });
  });

  async function montar() {
    const fixture = TestBed.createComponent(SeguroCuota);
    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('muestra coberturas, prima e IVA de la póliza emitida y el banco que cobra', async () => {
    const fixture = await montar();
    expect(api.consultarDetalle).toHaveBeenCalledOnceWith('p1');
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Tu seguro dentro de la cuota');
    expect(texto).toContain('Vida deudores y tu casa');
    expect(texto).toContain('49.100');
    expect(texto).toContain('23.760');
    expect(texto).toContain('4.514');
    expect(fixture.nativeElement.querySelector('.total').textContent).toContain('77.374');
    expect(fixture.nativeElement.querySelector('.introduccion').textContent).toContain(
      'Bancolombia lo cobra dentro de tu cuota',
    );
    expect(texto).not.toContain('320.000.000');
    expect(texto).not.toContain('380.000.000');
    expect(texto).not.toContain('Tu crédito cuesta');
  });

  it('usa la fecha de emisión y no la fecha de vigencia ni la de hoy', async () => {
    const fixture = await montar();
    const introduccion = fixture.nativeElement.querySelector('.introduccion').textContent;
    expect(introduccion).toContain('desde el 22 de octubre de 2026');
    expect(introduccion).not.toContain('23 de octubre');
  });

  it('ofrece regresar al Inicio y a la misma solicitud', async () => {
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.inicio').getAttribute('href')).toBe('/cuenta');
    expect(fixture.nativeElement.querySelector('.enlace').getAttribute('href')).toBe(
      '/cuenta/solicitudes/p1',
    );
  });

  it('solo muestra VIDA cuando no se contrató HOGAR', async () => {
    api.consultarDetalle.and.resolveTo({
      ...poliza,
      coberturas: [poliza.coberturas[0]],
      primaTotalMensual: 49100,
    });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Vida deudores');
    expect(fixture.nativeElement.textContent).not.toContain('Tu casa');
    expect(fixture.nativeElement.textContent).not.toContain('IVA de tu casa');
    expect(fixture.nativeElement.querySelector('.total').textContent).toContain('49.100');
  });

  it('muestra el total guardado en la póliza, sin recalcularlo desde la cotización', async () => {
    api.consultarDetalle.and.resolveTo({ ...poliza, primaTotalMensual: 80000 });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('.total').textContent).toContain('80.000');
  });

  for (const estado of ['PENDIENTE', 'RECHAZADA', 'VENCIDA'] as const) {
    it(`no presenta el seguro como activo cuando la póliza está ${estado}`, async () => {
      api.consultarDetalle.and.resolveTo({ ...poliza, estado });
      const fixture = await montar();
      expect(fixture.nativeElement.textContent).toContain(
        'Este detalle solo está disponible para pólizas emitidas',
      );
      expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Tu seguro está activo');
    });
  }

  for (const [status, mensaje] of [
    [404, 'No encontramos esta póliza'],
    [401, 'Tu sesión expiró'],
    [503, 'No pudimos consultar el detalle de tu seguro'],
  ] as const) {
    it(`maneja HTTP ${status} y permite reintentar`, async () => {
      api.consultarDetalle.and.rejectWith(new HttpErrorResponse({ status }));
      const fixture = await montar();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(mensaje);
      api.consultarDetalle.and.resolveTo(poliza);
      fixture.nativeElement.querySelector('button').click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.resumen')).not.toBeNull();
    });
  }

  for (const incompleta of [
    { ...poliza, emitidaEn: null },
    { ...poliza, emitidaEn: 'fecha-invalida' },
    { ...poliza, primaTotalMensual: NaN },
    { ...poliza, coberturas: [] },
  ]) {
    it('no inventa fechas ni importes cuando faltan datos de la póliza', async () => {
      api.consultarDetalle.and.resolveTo(incompleta);
      const fixture = await montar();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
    });
  }

  it('vuelve a consultar al cambiar el identificador de la ruta', async () => {
    const fixture = await montar();
    fixture.componentRef.setInput('id', 'p2');
    await fixture.whenStable();
    expect(api.consultarDetalle).toHaveBeenCalledWith('p2');
  });
});
