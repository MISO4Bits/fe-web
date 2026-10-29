import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { PolizasApiService } from '../solicitud/polizas-api.service';
import { CotizacionApiService, CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { Sesion } from '../../nucleo/sesion/sesion';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let api: jasmine.SpyObj<CotizacionApiService>;
  let polizas: jasmine.SpyObj<PolizasApiService>;
  const cotizacion: CotizacionRespuesta = {
    estado: 'VIGENTE',
    producto: 'VIDA_HIPOTECARIO',
    origenDatos: 'DECLARADO',
    datosCredito: {
      entidadAcreedora: 'Bancolombia',
      valorCredito: 380000000,
      saldoInsoluto: 320000000,
      plazoRestanteMeses: 180,
    },
    oferta: {
      primaMensual: 49100,
      primaBaseMensual: 49100,
      sumaAsegurada: 320000000,
      coberturaMeses: 180,
      moneda: 'COP',
      personalizado: false,
    },
    perfilRiesgo: null,
    vigenciaCotizacion: { desde: '2026-10-18T10:00:00Z', hasta: '2026-11-18T10:00:00Z' },
    creadaEn: '2026-10-18T10:00:00Z',
  };

  async function montar(actual: CotizacionRespuesta | null): Promise<void> {
    api.actual.and.resolveTo(actual);
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.removeItem('solventa.bienvenida-cotizacion:home-test@example.com');
    api = jasmine.createSpyObj<CotizacionApiService>('CotizacionApiService', ['actual']);
    polizas = jasmine.createSpyObj('PolizasApiService', ['listar']);
    polizas.listar.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: PolizasApiService, useValue: polizas },
        { provide: CotizacionApiService, useValue: api },
        { provide: Sesion, useValue: { actual: () => ({ correo: 'home-test@example.com' }) } },
      ],
    }).compileComponents();
  });
  afterEach(() => localStorage.removeItem('solventa.bienvenida-cotizacion:home-test@example.com'));

  it('ofrece consultar los seguros por ID y no muestra bienvenida ni estado vacío', async () => {
    polizas.listar.and.resolveTo([
      { polizaId: 'p1', estado: 'PENDIENTE', pendientes: [] },
      { polizaId: 'p2', numero: 'SOL-2', estado: 'EMITIDA', pendientes: [] },
      { polizaId: 'p3', estado: 'RECHAZADA', pendientes: [] },
    ]);
    await montar(null);
    const cards = fixture.nativeElement.querySelectorAll('.poliza-card');
    expect(cards.length).toBe(3);
    expect(cards[0].getAttribute('href')).toBe('/cuenta/solicitudes/p1');
    expect(cards[0].textContent).toContain('En revisión');
    expect(cards[1].textContent).toContain('Aprobada');
    expect(cards[2].textContent).toContain('No aprobada');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
  });

  it('permite reintentar una lista de seguros fallida sin ocultar la cotización', async () => {
    polizas.listar.and.rejectWith(new Error('sin conexión'));
    await montar(cotizacion);
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar tus seguros');
    expect(fixture.nativeElement.querySelector('.quote-card')).not.toBeNull();
    polizas.listar.and.resolveTo([{ polizaId: 'p1', estado: 'PENDIENTE', pendientes: [] }]);
    const boton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes('Reintentar seguros'))!;
    boton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.poliza-card')).not.toBeNull();
    expect(polizas.listar).toHaveBeenCalledTimes(2);
  });

  it('no repite la bienvenida al volver al Home vacío', async () => {
    await montar(null);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    fixture.destroy();
    await montar(null);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('no muestra bienvenida después de haber tenido una cotización', async () => {
    await montar(cotizacion);
    fixture.destroy();
    await montar(null);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra bienvenida y Home vacío cuando el BFF no devuelve cotizaciones', async () => {
    await montar(null);
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes seguros');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(api.actual).toHaveBeenCalledTimes(1);
  });

  it('cierra la bienvenida y conserva el Home vacío', async () => {
    await montar(null);
    fixture.nativeElement.querySelector('button.close').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
  });

  it('ofrece cotizar desde Home y bienvenida', async () => {
    await montar(null);
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(
      links.filter((link) => link.getAttribute('href') === '/cuenta/cotizaciones/nueva').length,
    ).toBe(3);
  });

  it('muestra la cotización vigente y permite retomarla', async () => {
    await montar(cotizacion);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Tienes una cotización en curso');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(texto).toContain('Bancolombia');
    expect(
      fixture.nativeElement
        .querySelector('a[aria-label="Retomar cotización vigente"]')
        ?.getAttribute('href'),
    ).toBe('/cuenta/cotizaciones/actual');
    expect(texto).not.toContain('Todavía no tienes seguros ni cotizaciones');
  });

  it('muestra un aviso y permite reintentar si la consulta al BFF falla', async () => {
    api.actual.and.rejectWith(new Error('BFF no disponible'));
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar tus cotizaciones');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
    api.actual.and.resolveTo(cotizacion);
    (fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tienes una cotización en curso');
  });

  it('trata el 404 como ausencia de cotización', async () => {
    api.actual.and.rejectWith(new HttpErrorResponse({ status: 404 }));
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos consultar');
  });

  it('no ofrece retomar una cotización expirada', async () => {
    await montar({ ...cotizacion, estado: 'EXPIRADA' });
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
    expect(
      fixture.nativeElement.querySelector('a[aria-label="Retomar cotización vigente"]'),
    ).toBeNull();
  });
});
