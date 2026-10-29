import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SolicitudEstado } from './solicitud-estado';
import { PolizasApiService, PolizaSolicitud } from './polizas-api.service';

describe('SolicitudEstado BITS-97', () => {
  let api: jasmine.SpyObj<PolizasApiService>;
  const pendiente: PolizaSolicitud = {
    polizaId: 'p1',
    estado: 'PENDIENTE',
    pendientes: [
      { codigo: 'CORREO_SIN_CONFIRMAR', tipo: 'USUARIO', mensaje: 'Revisa el enlace en tu correo' },
      {
        codigo: 'CREDITO_NO_VERIFICADO',
        tipo: 'AGENTE',
        mensaje: 'Los datos de tu crédito deben ser verificados por un agente',
      },
    ],
  };
  beforeEach(() => {
    api = jasmine.createSpyObj('PolizasApiService', ['consultar']);
    api.consultar.and.resolveTo(pendiente);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PolizasApiService, useValue: api }],
    });
  });
  async function montar() {
    const fixture = TestBed.createComponent(SolicitudEstado);
    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('consulta por identificador y muestra exclusivamente los pendientes reales', async () => {
    const fixture = await montar();
    expect(api.consultar).toHaveBeenCalledOnceWith('p1');
    expect(fixture.nativeElement.textContent).toContain('Revisamos tu solicitud');
    expect(fixture.nativeElement.textContent).toContain('Revisa el enlace en tu correo');
    expect(fixture.nativeElement.textContent).toContain(
      'Los datos de tu crédito deben ser verificados',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Un agente está revisando tus documentos',
    );
    expect(fixture.nativeElement.querySelectorAll('.pendientes li').length).toBe(2);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/cuenta');
    expect(fixture.nativeElement.querySelector('.detalles')).toBeNull();
  });

  it('muestra la emisión con fechas reales y deja Ver los detalles sin acción', async () => {
    api.consultar.and.resolveTo({
      ...pendiente,
      estado: 'EMITIDA',
      pendientes: [],
      emitidaEn: '2026-10-29T16:20:00Z',
      vigencia: { desde: '2026-10-30T05:00:00Z', hasta: '2027-10-30T05:00:00Z' },
    });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Solicitud aprobada');
    expect(fixture.nativeElement.textContent).toContain('29/10/2026');
    expect(fixture.nativeElement.textContent).toContain('30/10/2026');
    expect(fixture.nativeElement.querySelector('.pendientes')).toBeNull();
    const detalles = fixture.nativeElement.querySelector('.detalles') as HTMLButtonElement;
    detalles.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Solicitud aprobada');
    expect(api.consultar).toHaveBeenCalledTimes(1);
  });

  it('presenta motivos de rechazo e ignora pendientes residuales del backend', async () => {
    api.consultar.and.resolveTo({
      ...pendiente,
      estado: 'RECHAZADA',
      rechazo: {
        motivos: [
          {
            codigo: 'CREDITO_NO_VERIFICADO',
            mensaje: 'No pudimos verificar los datos de tu crédito con la entidad acreedora.',
          },
        ],
        rechazadaEn: '2026-10-29T16:20:00Z',
      },
    });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('No aprobamos tu solicitud');
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos verificar los datos de tu crédito',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Revisa el enlace en tu correo');
    expect(fixture.nativeElement.textContent).not.toContain('Activamos tu seguro');
    expect(fixture.nativeElement.querySelector('.detalles')).toBeNull();
  });

  for (const estado of ['EMITIDA', 'RECHAZADA'] as const) {
    it(`actualiza una pendiente a ${estado} al regresar a la ventana sin volver a enviar`, async () => {
      const fixture = await montar();
      api.consultar.and.resolveTo({
        ...pendiente,
        estado,
        pendientes: [],
        rechazo:
          estado === 'RECHAZADA'
            ? {
                motivos: [{ codigo: 'CREDITO_NO_VERIFICADO', mensaje: 'Crédito no verificado' }],
                rechazadaEn: '2026-10-29T16:20:00Z',
              }
            : null,
      });
      window.dispatchEvent(new Event('focus'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(api.consultar).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe(
        estado === 'EMITIDA' ? 'Solicitud aprobada' : 'No aprobamos tu solicitud',
      );
    });
  }

  it('recupera el estado al recargar la ruta y al abrir otra solicitud', async () => {
    const fixture = await montar();
    fixture.componentRef.setInput('id', 'p2');
    await fixture.whenStable();
    expect(api.consultar).toHaveBeenCalledWith('p2');
    fixture.destroy();
    await montar();
    expect(api.consultar).toHaveBeenCalledTimes(3);
  });

  for (const [status, texto] of [
    [404, 'No encontramos esta solicitud'],
    [401, 'Tu sesión expiró'],
    [503, 'No pudimos consultar tu solicitud'],
  ] as const) {
    it(`maneja HTTP ${status} y permite reintentar la consulta`, async () => {
      api.consultar.and.rejectWith(new HttpErrorResponse({ status }));
      const fixture = await montar();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(texto);
      api.consultar.and.resolveTo(pendiente);
      fixture.nativeElement.querySelector('button').click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Revisamos tu solicitud');
    });
  }

  it('no presenta una solicitud vencida como aprobada', async () => {
    api.consultar.and.resolveTo({ ...pendiente, estado: 'VENCIDA' });
    const fixture = await montar();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Tu solicitud venció');
    expect(fixture.nativeElement.querySelector('.detalles')).toBeNull();
  });
});
