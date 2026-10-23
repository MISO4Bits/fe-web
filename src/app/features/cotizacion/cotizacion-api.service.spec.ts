import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { CotizacionApiService } from './cotizacion-api.service';

describe('CotizacionApiService BITS-292', () => {
  let api: CotizacionApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: 'http://localhost:8081' },
        { provide: SessionService, useValue: { validAccessToken: async () => 'token-prueba' } },
      ],
    });
    api = TestBed.inject(CotizacionApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envía los datos del crédito al endpoint de cotizaciones con Bearer', async () => {
    const datos = {
      entidadAcreedora: 'BBVA Colombia',
      valorCredito: 200000000,
      saldoInsoluto: 150000000,
      plazoRestanteMeses: 180,
    };
    const promesa = api.crear(datos);
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8081/v1/cotizaciones');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    expect(req.request.body).toEqual({ datosCredito: datos });
    req.flush({ estado: 'VIGENTE' });
    await expectAsync(promesa).toBeResolved();
  });
  it('consulta la cotización vigente', async () => {
    const promesa = api.actual();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8081/v1/cotizaciones/actual');
    expect(req.request.method).toBe('GET');
    req.flush(null);
    await expectAsync(promesa).toBeResolvedTo(null);
  });

  it('BITS-337: elimina la cotización propia con Bearer y sin cuerpo', async () => {
    const promesa = api.eliminarActual();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8081/v1/cotizaciones/actual');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
    await expectAsync(promesa).toBeResolved();
  });
});
