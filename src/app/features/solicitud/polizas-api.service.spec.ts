import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { PolizasApiService, SolicitarPoliza } from './polizas-api.service';

describe('PolizasApiService', () => {
  let api: PolizasApiService;
  let http: HttpTestingController;
  const solicitud: SolicitarPoliza = {
    coberturas: ['VIDA'],
    cotizacionCreadaEn: '2026-10-23T10:00:00Z',
    documentosAceptados: [{ tipo: 'poliza', version: 'V1' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: '/api/' },
        { provide: SessionService, useValue: { validAccessToken: async () => 'token' } },
      ],
    });
    api = TestBed.inject(PolizasApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista solicitudes y consulta una por identificador con autenticación', async () => {
    const lista = api.listar();
    await Promise.resolve();
    await Promise.resolve();
    const listar = http.expectOne('/api/v1/cuenta/polizas');
    expect(listar.request.method).toBe('GET');
    expect(listar.request.headers.get('Authorization')).toBe('Bearer token');
    listar.flush([]);
    await expectAsync(lista).toBeResolvedTo([]);
    const detalle = api.consultar('p/1');
    await Promise.resolve();
    await Promise.resolve();
    const consultar = http.expectOne('/api/v1/cuenta/polizas/p%2F1');
    expect(consultar.request.method).toBe('GET');
    expect(consultar.request.headers.get('Authorization')).toBe('Bearer token');
    const respuesta = { polizaId: 'p/1', estado: 'PENDIENTE' as const, pendientes: [] };
    consultar.flush(respuesta);
    await expectAsync(detalle).toBeResolvedTo(respuesta);
  });

  for (const status of [200, 201]) {
    it(`acepta HTTP ${status} y envía únicamente el contrato autenticado`, async () => {
      const pendiente = api.solicitar(solicitud);
      await Promise.resolve();
      await Promise.resolve();
      const req = http.expectOne('/api/v1/cuenta/polizas');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token');
      expect(req.request.body).toEqual(solicitud);
      const respuesta = { polizaId: 'p1', estado: 'EMITIDA' as const, pendientes: [] };
      req.flush(respuesta, { status, statusText: 'OK' });
      await expectAsync(pendiente).toBeResolvedTo(respuesta);
    });
  }

  it('no registra solicitudes sin sesión', async () => {
    spyOn(TestBed.inject(SessionService), 'validAccessToken').and.resolveTo(null);
    await expectAsync(api.solicitar(solicitud)).toBeRejectedWithError('SESION_EXPIRADA');
    http.expectNone('/api/v1/cuenta/polizas');
  });
});
