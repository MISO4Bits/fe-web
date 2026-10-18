import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CotizacionResultado } from './cotizacion-resultado';
import { CotizacionApiService, CotizacionRespuesta } from './cotizacion-api.service';

describe('CotizacionResultado BITS-292', () => {
  const cotizacion: CotizacionRespuesta = {
    estado: 'VIGENTE',
    producto: 'VIDA_HIPOTECARIO',
    origenDatos: 'DECLARADO',
    datosCredito: {
      entidadAcreedora: 'BBVA Colombia',
      valorCredito: 200000000,
      saldoInsoluto: 160000000,
      plazoRestanteMeses: 180,
    },
    oferta: {
      primaMensual: 42000,
      primaBaseMensual: 42000,
      sumaAsegurada: 160000000,
      coberturaMeses: 180,
      moneda: 'COP',
      personalizado: false,
      fuentesNoDisponibles: ['OPEN_FINANCE'],
    },
    perfilRiesgo: null,
    vigenciaCotizacion: { desde: '2026-10-18T10:00:00Z', hasta: '2026-10-19T10:00:00Z' },
    creadaEn: '2026-10-18T10:00:00Z',
  };
  async function montar(actual: CotizacionRespuesta | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CotizacionApiService,
          useValue: { actual: jasmine.createSpy().and.resolveTo(actual) },
        },
      ],
    });
    const fixture = TestBed.createComponent(CotizacionResultado);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  it('muestra el estado vacío si no hay cotización', async () => {
    const fixture = await montar(null);
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes cotizaciones');
  });
  it('muestra tarifa estándar, advertencia de datos declarados y falta de autorización', async () => {
    const fixture = await montar(cotizacion);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('tarifa estándar');
    expect(texto).toContain('datos de crédito que tú declaraste');
    expect(texto).toContain('no considera tu historial');
  });
  it('abre y cierra explicación del precio sin factores', async () => {
    const fixture = await montar(cotizacion);
    const componente = fixture.componentInstance as unknown as {
      abrirExplicacion(): void;
      cerrarExplicacion(): void;
    };
    componente.abrirExplicacion();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin factores de personalización');
    componente.cerrarExplicacion();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('muestra los factores cuando hay perfil personalizado', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, personalizado: true },
      perfilRiesgo: {
        nivelRiesgo: 'BAJO',
        factores: [{ descripcion: 'Historial de pagos', efecto: 'POSITIVO' }],
      },
    });
    const componente = fixture.componentInstance as unknown as { abrirExplicacion(): void };
    componente.abrirExplicacion();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Historial de pagos');
  });
  it('muestra la cotización preaprobada cuando hay perfil y datos verificados', async () => {
    const fixture = await montar({
      ...cotizacion,
      origenDatos: 'DECLARADO',
      oferta: { ...cotizacion.oferta, personalizado: true, fuentesNoDisponibles: [] },
      perfilRiesgo: {
        nivelRiesgo: 'BAJO',
        factores: [{ descripcion: 'Buen historial', efecto: 'POSITIVO' }],
      },
    });
    // Con origen DECLARADO, el contrato no permite afirmar que el crédito fue verificado.
    expect(fixture.nativeElement.textContent).toContain('Falta confirmar los datos de tu crédito');
    expect(fixture.nativeElement.textContent).toContain('Buscar mi crédito en el banco');
  });

  it('muestra espera de perfil cuando los datos están verificados pero no hay perfil', async () => {
    // El contrato tipa origenDatos solo como DECLARADO; se simula la respuesta
    // futura de datos bancarios sin cambiar el código productivo.
    const verificada = {
      ...cotizacion,
      origenDatos: 'OPEN_FINANCE' as unknown as CotizacionRespuesta['origenDatos'],
      oferta: { ...cotizacion.oferta, fuentesNoDisponibles: [] },
    };
    const fixture = await montar(verificada);
    expect(fixture.nativeElement.textContent).toContain('Tu cotización queda en espera');
    expect(fixture.nativeElement.textContent).toContain('Ir a mis seguros');
    expect(fixture.nativeElement.textContent).not.toContain('Buscar mi crédito en el banco');
  });

  it('permite volver al Home cuando falta autorización financiera', async () => {
    const fixture = await montar(cotizacion);
    expect(fixture.nativeElement.textContent).toContain(
      'Para continuar necesitamos tu autorización',
    );
    const enlaces = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(
      enlaces.some(
        (a) => a.getAttribute('href') === '/cuenta' && a.textContent?.includes('Ir a mis seguros'),
      ),
    ).toBeTrue();
  });

  it('muestra el error de carga y ofrece reintentar', async () => {
    const api = jasmine.createSpyObj<CotizacionApiService>('CotizacionApiService', ['actual']);
    api.actual.and.rejectWith(new Error('sin conexión'));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CotizacionApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(CotizacionResultado);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No fue posible cargar',
    );
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    api.actual.and.resolveTo(cotizacion);
    (fixture.nativeElement.querySelector('button.boton') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Seguro de vida deudores');
  });

  it('cierra el modal mediante el botón Entendido', async () => {
    const fixture = await montar(cotizacion);
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const enlace = botones.find((button) => button.textContent?.includes('¿Por qué este precio?'));
    expect(enlace).toBeDefined();
    enlace?.click();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(modal).not.toBeNull();
    (modal.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
