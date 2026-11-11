import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { SiniestrosApiService } from './siniestros-api.service';

describe('SiniestrosApiService', () => {
  let api: SiniestrosApiService;
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
    api = TestBed.inject(SiniestrosApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta el detalle autenticado y codifica el identificador', async () => {
    const pendiente = api.consultar('s/1');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('/api/v1/cuenta/siniestros/s%2F1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    const respuesta = { id: 's/1', numero: 'SIN-1', estado: 'EN_ESTUDIO' };
    req.flush(respuesta);
    await expectAsync(pendiente).toBeResolvedTo(jasmine.objectContaining(respuesta));
  });

  it('lista los siniestros de la cuenta', async () => {
    const pendiente = api.listar();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('/api/v1/cuenta/siniestros');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush([]);
    await expectAsync(pendiente).toBeResolvedTo([]);
  });
});
