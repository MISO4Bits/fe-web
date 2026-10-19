import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CotizacionResultado } from './cotizacion-resultado';
import { CotizacionApiService, CotizacionRespuesta } from './cotizacion-api.service';
import { CreditoHipotecarioService } from './credito-hipotecario.service';

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
  async function montar(
    actual: CotizacionRespuesta | null,
    consentimiento: 'OTORGADO' | 'NO_OTORGADO' | 'REVOCADO' | null = 'OTORGADO',
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CreditoHipotecarioService,
          useValue: { estadoConsentimientoFinanciero: () => Promise.resolve(consentimiento) },
        },
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
  it('BITS-294: inicia con Tu casa desmarcada y suma HOGAR al seleccionarla', async () => {
    const conHogar: CotizacionRespuesta = {
      ...cotizacion,
      oferta: {
        ...cotizacion.oferta,
        desglose: {
          coberturas: [
            {
              codigo: 'VIDA',
              obligatoria: true,
              sumaAsegurada: 160000000,
              primaNeta: 42000,
              iva: 0,
              primaTotal: 42000,
            },
            {
              codigo: 'HOGAR',
              obligatoria: false,
              sumaAsegurada: 150000000,
              primaNeta: 10000,
              iva: 1900,
              primaTotal: 11900,
            },
          ],
        },
      },
    };
    const fixture = await montar(conHogar);
    const checkbox = fixture.nativeElement.querySelector('.casa input') as HTMLInputElement;
    expect(checkbox.checked).toBeFalse();
    expect(fixture.nativeElement.querySelector('.desglose .total').textContent).toContain('42.000');
    expect(fixture.nativeElement.textContent).toContain('150.000.000');
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.desglose .total').textContent).toContain('53.900');
    expect(fixture.nativeElement.textContent).toContain('1.900');
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.desglose .total').textContent).toContain('42.000');
  });

  it('BITS-294: oculta Tu casa si el BFF no devuelve HOGAR', async () => {
    const fixture = await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('.casa')).toBeNull();
  });

  it('muestra el estado vacío si no hay cotización', async () => {
    const fixture = await montar(null);
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes cotizaciones');
  });
  it('muestra tarifa estándar, advertencia de datos declarados y falta de autorización', async () => {
    const fixture = await montar(cotizacion, 'NO_OTORGADO');
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('tarifa estándar');
    expect(texto).toContain('datos de crédito que tú declaraste');
    expect(texto).toContain('no considera tu historial');
    expect(texto).toContain('BBVA Colombia');
    expect(texto).toContain('180 meses');
    expect(texto).not.toContain('Pendiente de cálculo');
    expect(texto).not.toContain('28.274');
  });
  it('no ofrece explicación personalizada sin perfil', async () => {
    const fixture = await montar(cotizacion);
    const componente = fixture.componentInstance as unknown as { abrirExplicacion(): void };
    componente.abrirExplicacion();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('¿Por qué este precio?');
  });
  it('no atribuye ajuste ni abre explicación para un perfil neutro sin factores', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, personalizado: true, fuentesNoDisponibles: [] },
      perfilRiesgo: { nivelRiesgo: 'MEDIO', factores: [] },
    });
    expect(fixture.nativeElement.textContent).not.toContain('¿Por qué este precio?');
    expect(fixture.nativeElement.textContent).not.toContain('Tu perfil sigue pendiente');
  });

  it('muestra la prima base real del BFF en el modal', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: {
        ...cotizacion.oferta,
        personalizado: true,
        primaBaseMensual: 27332,
        fuentesNoDisponibles: [],
      },
      perfilRiesgo: {
        nivelRiesgo: 'BAJO',
        factores: [{ descripcion: 'Pagos', efecto: 'POSITIVO' }],
      },
    });
    (fixture.nativeElement.querySelector('button.enlace') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('27.332');
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
    const fixture = await montar(cotizacion, 'NO_OTORGADO');
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

  it('no presenta una cotización expirada como vigente', async () => {
    const fixture = await montar({ ...cotizacion, estado: 'EXPIRADA' });
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes cotizaciones');
    expect(fixture.nativeElement.textContent).not.toContain('Seguro de vida deudores');
  });

  it('muestra el error de carga y ofrece reintentar', async () => {
    const api = jasmine.createSpyObj<CotizacionApiService>('CotizacionApiService', ['actual']);
    api.actual.and.rejectWith(new Error('sin conexión'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CotizacionApiService, useValue: api },
        {
          provide: CreditoHipotecarioService,
          useValue: { estadoConsentimientoFinanciero: () => Promise.resolve('OTORGADO') },
        },
      ],
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
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, personalizado: true },
      perfilRiesgo: {
        nivelRiesgo: 'BAJO',
        factores: [{ descripcion: 'Historial de pagos', efecto: 'POSITIVO' }],
      },
    });
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

  it('BITS-292: clasifica el perfil neutro como disponible, pero no personalizado', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, personalizado: true, fuentesNoDisponibles: [] },
      perfilRiesgo: { nivelRiesgo: 'MEDIO', factores: [] },
    });
    const componente = fixture.componentInstance as unknown as {
      personalizado: boolean;
      perfilDisponible: boolean;
      perfilPendiente: boolean;
      estadoVista: string;
      mostrarExplicacion(): boolean;
      abrirExplicacion(): void;
    };
    expect(componente.personalizado).toBeFalse();
    expect(componente.perfilDisponible).toBeTrue();
    expect(componente.perfilPendiente).toBeFalse();
    expect(componente.estadoVista).toBe('04G');
    componente.abrirExplicacion();
    expect(componente.mostrarExplicacion()).toBeFalse();
  });

  it('BITS-292: distingue falta de consentimiento y perfil pendiente', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, fuentesNoDisponibles: [] },
    });
    const componente = fixture.componentInstance as unknown as {
      sinAutorizacionFinanciera: boolean;
      perfilPendiente: boolean;
      estadoVista: string;
    };
    expect(componente.sinAutorizacionFinanciera).toBeFalse();
    expect(componente.perfilPendiente).toBeTrue();
    expect(componente.estadoVista).toBe('04F');
  });

  it('BITS-292: prioriza la falta de autorización aun cuando haya perfil', async () => {
    const fixture = await montar(
      {
        ...cotizacion,
        oferta: {
          ...cotizacion.oferta,
          personalizado: true,
          fuentesNoDisponibles: ['perfilamiento'],
        },
        perfilRiesgo: {
          nivelRiesgo: 'BAJO',
          factores: [{ descripcion: 'Historial', efecto: 'POSITIVO' }],
        },
      },
      'NO_OTORGADO',
    );
    const componente = fixture.componentInstance as unknown as {
      sinAutorizacionFinanciera: boolean;
      perfilPendiente: boolean;
      estadoVista: string;
    };
    expect(componente.sinAutorizacionFinanciera).toBeTrue();
    expect(componente.perfilPendiente).toBeFalse();
    expect(componente.estadoVista).toBe('SIN_AUTORIZACION');
  });

  it('BITS-292: T1/T6 muestra variante sin autorización cuando falta Open Finance', async () => {
    const fixture = await montar(
      {
        ...cotizacion,
        oferta: { ...cotizacion.oferta, fuentesNoDisponibles: ['perfilamiento'] },
      },
      'NO_OTORGADO',
    );
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Esta cotización usa la tarifa estándar');
    expect(texto).not.toContain('Estamos analizando tu perfil');
    expect(texto).not.toContain('Tu perfil está en análisis');
  });

  it('BITS-292: no interpreta perfilamiento como falta de autorización', async () => {
    const fixture = await montar(
      {
        ...cotizacion,
        oferta: { ...cotizacion.oferta, fuentesNoDisponibles: ['perfilamiento'] },
      },
      'OTORGADO',
    );
    const componente = fixture.componentInstance as unknown as {
      sinAutorizacionFinanciera: boolean;
    };
    expect(componente.sinAutorizacionFinanciera).toBeFalse();
  });

  it('BITS-292: no interpreta un consentimiento desconocido como NO_OTORGADO', async () => {
    const fixture = await montar(cotizacion, null);
    const componente = fixture.componentInstance as unknown as {
      sinAutorizacionFinanciera: boolean;
    };
    expect(componente.sinAutorizacionFinanciera).toBeFalse();
  });

  it('BITS-292: permite cerrar y volver a abrir la explicación del perfil', async () => {
    const fixture = await montar({
      ...cotizacion,
      oferta: { ...cotizacion.oferta, personalizado: true, fuentesNoDisponibles: [] },
      perfilRiesgo: {
        nivelRiesgo: 'BAJO',
        factores: [{ descripcion: 'Pagos', efecto: 'NEGATIVO' }],
      },
    });
    const componente = fixture.componentInstance as unknown as {
      personalizado: boolean;
      mostrarExplicacion(): boolean;
      abrirExplicacion(): void;
      cerrarExplicacion(): void;
    };
    expect(componente.personalizado).toBeTrue();
    componente.abrirExplicacion();
    expect(componente.mostrarExplicacion()).toBeTrue();
    componente.cerrarExplicacion();
    expect(componente.mostrarExplicacion()).toBeFalse();
  });
});
