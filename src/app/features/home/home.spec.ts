import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Home } from './home';
import { PolizasApiService, ResumenPolizaSolicitud } from '../solicitud/polizas-api.service';
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

  function solicitud(): ResumenPolizaSolicitud {
    return {
      polizaId: 'p1',
      estado: 'PENDIENTE',
      datosCredito: {
        ...cotizacion.datosCredito,
        entidadAcreedora: 'Banco de la solicitud',
        saldoInsoluto: 120000000,
      },
      primaTotalMensual: 60000,
      pendientes: [
        {
          codigo: 'CORREO_SIN_CONFIRMAR',
          tipo: 'USUARIO',
          mensaje: 'Revisa el enlace en tu correo',
        },
        {
          codigo: 'CREDITO_NO_VERIFICADO',
          tipo: 'AGENTE',
          mensaje: 'Los datos de tu crédito deben ser verificados por un agente',
        },
      ],
    };
  }

  it('03C: muestra la solicitud pendiente y sus importes en lugar de la cotización', async () => {
    polizas.listar.and.resolveTo([solicitud()]);
    await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
      'Tu solicitud está en revisión',
    );
    const card = fixture.nativeElement.querySelector('.poliza-card');
    expect(card.getAttribute('href')).toBe('/cuenta/solicitudes/p1');
    expect(card.textContent).toContain('Banco de la solicitud');
    expect(card.textContent).toContain('120.000.000');
    expect(card.textContent).toContain('60.000');
    expect(card.textContent).toContain('En revisión');
    expect(card.querySelectorAll('.pendientes-home li').length).toBe(2);
    expect(card.textContent).not.toContain('Un agente está revisando tus documentos');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Retomar cotización vigente"]'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
  });

  it('03C: muestra la solicitud incluso sin cotización activa', async () => {
    polizas.listar.and.resolveTo([solicitud()]);
    await montar(null);
    expect(fixture.nativeElement.querySelector('.poliza-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
  });

  function rechazada(): ResumenPolizaSolicitud {
    return {
      ...solicitud(),
      estado: 'RECHAZADA',
      rechazo: {
        motivos: [
          {
            codigo: 'CREDITO_NO_VERIFICADO',
            mensaje: 'No pudimos verificar los datos de tu crédito con la entidad acreedora.',
          },
        ],
        rechazadaEn: '2026-10-31T10:20:00Z',
      },
    };
  }

  it('AC-4: muestra la rechazada con su motivo y acceso al detalle en lugar de la cotización', async () => {
    polizas.listar.and.resolveTo([rechazada()]);
    await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
      'Tu solicitud no fue aprobada',
    );
    const card = fixture.nativeElement.querySelector('.solicitud-rechazada');
    expect(card.getAttribute('href')).toBe('/cuenta/solicitudes/p1');
    expect(card.textContent).toContain('No aprobada');
    expect(card.textContent).toContain('No pudimos verificar los datos de tu crédito');
    expect(card.textContent).toContain('Ver motivo y solicitud');
    expect(card.querySelector('.pendientes-home')).toBeNull();
    expect(card.textContent).not.toContain('Revisa el enlace en tu correo');
    expect(fixture.nativeElement.textContent).not.toContain('Tienes una cotización en curso');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Retomar cotización vigente"]'),
    ).toBeNull();
  });

  it('no muestra la bienvenida ni espera una aprobación futura si solo existe una rechazada', async () => {
    polizas.listar.and.resolveTo([rechazada()]);
    await montar(null);
    expect(fixture.nativeElement.querySelector('.solicitud-rechazada')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Aparecen aquí cuando aprobemos');
  });

  it('prioriza la solicitud pendiente ante rechazos históricos', async () => {
    polizas.listar.and.resolveTo([rechazada(), { ...solicitud(), polizaId: 'p2' }]);
    await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
      'Tu solicitud está en revisión',
    );
    expect(fixture.nativeElement.querySelector('.poliza-card').getAttribute('href')).toBe(
      '/cuenta/solicitudes/p2',
    );
  });

  it('presenta el rechazo más reciente aunque la lista no venga ordenada', async () => {
    const reciente = {
      ...rechazada(),
      polizaId: 'p2',
      rechazo: {
        motivos: [{ codigo: 'EVIDENCIA_FALTANTE', mensaje: 'No pudimos validar tu identidad.' }],
        rechazadaEn: '2026-11-01T10:00:00Z',
      },
    };
    polizas.listar.and.resolveTo([rechazada(), reciente]);
    await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('.poliza-card').getAttribute('href')).toBe(
      '/cuenta/solicitudes/p2',
    );
    expect(fixture.nativeElement.querySelector('.motivos-home').textContent).toContain(
      'No pudimos validar tu identidad',
    );
  });

  it('permite cotizar después de un rechazo sin mostrar el aviso de solicitud en revisión', async () => {
    polizas.listar.and.resolveTo([rechazada()]);
    await montar(cotizacion);
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('.quick-card').click();
    expect(navegar).toHaveBeenCalledOnceWith(['/cuenta/cotizaciones/nueva']);
    expect((fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).open).toBeFalse();
  });

  it('03D: Volver conserva la solicitud y no navega', async () => {
    const pendiente = solicitud();
    polizas.listar.and.resolveTo([pendiente]);
    await montar(cotizacion);
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('.quick-card').click();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('¿Quieres hacer una nueva cotización?');
    dialog.querySelector<HTMLButtonElement>('.volver')!.click();
    expect(dialog.open).toBeFalse();
    expect(navegar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.poliza-card')).not.toBeNull();
    expect(pendiente.estado).toBe('PENDIENTE');
    expect(polizas.listar).toHaveBeenCalledTimes(1);
  });

  it('03D: solo al confirmar continúa a nueva cotización sin modificar la solicitud', async () => {
    const pendiente = solicitud();
    polizas.listar.and.resolveTo([pendiente]);
    await montar(cotizacion);
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('.quick-card').click();
    fixture.nativeElement.querySelector('dialog .primary').click();
    expect(navegar).toHaveBeenCalledOnceWith(['/cuenta/cotizaciones/nueva']);
    expect(pendiente.estado).toBe('PENDIENTE');
    expect(polizas.listar).toHaveBeenCalledTimes(1);
  });

  it('sin solicitud pendiente abre nueva cotización directamente', async () => {
    await montar(cotizacion);
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('.quick-card').click();
    expect(navegar).toHaveBeenCalledOnceWith(['/cuenta/cotizaciones/nueva']);
    expect((fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).open).toBeFalse();
  });

  it('si falla el listado permite reintentar y no deja omitir la confirmación', async () => {
    polizas.listar.and.rejectWith(new Error('sin conexión'));
    await montar(cotizacion);
    expect(fixture.nativeElement.querySelector('.quick-card').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar tus solicitudes');
    polizas.listar.and.resolveTo([solicitud()]);
    const reintentar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes('Reintentar solicitudes'))!;
    reintentar.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.poliza-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.quick-card').disabled).toBeFalse();
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
    ).toBe(2);
    expect(fixture.nativeElement.querySelector('button.quick-card')).not.toBeNull();
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
