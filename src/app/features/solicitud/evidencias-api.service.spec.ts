import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { EvidenciasApiService } from './evidencias-api.service';

describe('EvidenciasApiService', () => {
  let api: EvidenciasApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: '/api/' },
        { provide: SessionService, useValue: { validAccessToken: async () => 'token' } },
      ],
    });
    api = TestBed.inject(EvidenciasApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('no envía archivos ni consulta evidencias cuando la sesión expiró', async () => {
    spyOn(TestBed.inject(SessionService), 'validAccessToken').and.resolveTo(null);
    await expectAsync(api.consultar()).toBeRejectedWithError('SESION_EXPIRADA');
    await expectAsync(api.subir('selfie', new File(['foto'], 'selfie.jpg'))).toBeRejectedWithError(
      'SESION_EXPIRADA',
    );
    http.expectNone('/api/v1/cuenta/evidencias-identidad');
  });

  it('consulta el estado de las evidencias autenticadas', async () => {
    const pendiente = api.consultar();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('/api/v1/cuenta/evidencias-identidad');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush([]);
    await expectAsync(pendiente).toBeResolvedTo([]);
  });

  for (const estado of ['ACEPTADA', 'REINTENTAR', 'REVISION_MANUAL'] as const) {
    it(`envía solo tipo e imagen y acepta el veredicto ${estado}`, async () => {
      const imagen = new File(['imagen'], 'foto.jpg', { type: 'image/jpeg' });
      const pendiente = api.subir('cedula_frente', imagen);
      await Promise.resolve();
      await Promise.resolve();
      const req = http.expectOne('/api/v1/cuenta/evidencias-identidad');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token');
      expect(req.request.headers.has('Content-Type')).toBeFalse();
      const body = req.request.body as FormData;
      expect(Array.from(body.keys())).toEqual(['tipo', 'imagen']);
      expect(body.get('tipo')).toBe('cedula_frente');
      expect(body.get('imagen')).toBe(imagen);
      const respuesta = { tipo: 'cedula_frente' as const, estado, intentosRestantes: 2 };
      req.flush(respuesta, { status: estado === 'REINTENTAR' ? 200 : 201, statusText: 'OK' });
      await expectAsync(pendiente).toBeResolvedTo(respuesta);
    });
  }
});
