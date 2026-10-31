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

  it('consulta el detalle completo de la póliza por ID con autenticación', async () => {
    const pendiente = api.consultarDetalle('p/1');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('/api/v1/cuenta/polizas/p%2F1');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    const respuesta = {
      polizaId: 'p/1',
      estado: 'EMITIDA',
      primaTotalMensual: 77374,
      emitidaEn: '2026-10-22T15:00:00Z',
      coberturas: [],
      datosCredito: { entidadAcreedora: 'Bancolombia' },
    };
    req.flush(respuesta);
    await expectAsync(pendiente).toBeResolvedTo(jasmine.objectContaining(respuesta));
  });

  it('consulta el listado de pólizas autenticado para el Inicio', async () => {
    const pendiente = api.listar();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('/api/v1/cuenta/polizas');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush([]);
    await expectAsync(pendiente).toBeResolvedTo([]);
  });

  it('consulta una solicitud por identificador con autenticación', async () => {
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

  for (const status of [200, 202]) {
    it(`consulta el documento autenticado y maneja HTTP ${status}`, async () => {
      const pendiente = api.documento('p/1');
      await Promise.resolve();
      await Promise.resolve();
      const req = http.expectOne('/api/v1/cuenta/polizas/p%2F1/documento');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token');
      req.flush(
        status === 200 ? { estado: 'LISTO', url: 'https://example.com/poliza.pdf' } : null,
        { status, statusText: 'OK' },
      );
      expect((await pendiente).estado).toBe(status === 200 ? 'LISTO' : 'GENERANDO');
    });
  }

  it('no registra solicitudes sin sesión', async () => {
    spyOn(TestBed.inject(SessionService), 'validAccessToken').and.resolveTo(null);
    await expectAsync(api.solicitar(solicitud)).toBeRejectedWithError('SESION_EXPIRADA');
    http.expectNone('/api/v1/cuenta/polizas');
  });
});
