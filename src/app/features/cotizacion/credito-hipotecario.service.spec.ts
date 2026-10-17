import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import {
  CreditoHipotecarioService,
  CreditosHipotecariosRespuesta,
} from './credito-hipotecario.service';

describe('CreditoHipotecarioService BITS-219', () => {
  let service: CreditoHipotecarioService;
  let http: HttpTestingController;
  let session: jasmine.SpyObj<SessionService>;

  beforeEach(() => {
    session = jasmine.createSpyObj<SessionService>('SessionService', ['validAccessToken']);
    session.validAccessToken.and.resolveTo('token-de-prueba');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: 'http://localhost:8081/' },
        { provide: SessionService, useValue: session },
      ],
    });
    service = TestBed.inject(CreditoHipotecarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reconoce solamente el consentimiento OPEN_FINANCE otorgado y vigente', async () => {
    const pending = service.tieneConsentimientoFinanciero();
    await Promise.resolve();
    const request = http.expectOne('http://localhost:8081/v1/cuenta/consentimientos');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    request.flush([
      { scope: 'OPEN_DATA', estado: 'OTORGADO', vigente: true },
      { scope: 'OPEN_FINANCE', estado: 'REVOCADO', vigente: true },
      { scope: 'OPEN_FINANCE', estado: 'OTORGADO', vigente: false },
      { scope: 'OPEN_FINANCE', estado: 'OTORGADO', vigente: true },
    ]);
    expect(await pending).toBeTrue();
  });

  it('rechaza consentimiento ausente, revocado o no vigente', async () => {
    for (const consentimientos of [
      [],
      [{ scope: 'OPEN_DATA', estado: 'OTORGADO', vigente: true }],
      [{ scope: 'OPEN_FINANCE', estado: 'REVOCADO', vigente: true }],
      [{ scope: 'OPEN_FINANCE', estado: 'OTORGADO', vigente: false }],
    ]) {
      const pending = service.tieneConsentimientoFinanciero();
      await Promise.resolve();
      http.expectOne('http://localhost:8081/v1/cuenta/consentimientos').flush(consentimientos);
      expect(await pending).toBeFalse();
    }
  });

  it('consulta créditos hipotecarios en mercado CO con Bearer y conserva respuesta', async () => {
    const response: CreditosHipotecariosRespuesta = {
      estado: 'DISPONIBLE',
      origen: 'OPEN_FINANCE',
      fechaConsulta: '2026-10-17T08:00:00Z',
      entidades: [{ id: 'b1', nombre: 'Bancolombia' }],
      creditos: [
        {
          entidadId: 'b1',
          entidadNombre: 'Bancolombia',
          valorCredito: 90000000,
          saldoInsoluto: 50000000,
          plazoRestanteMeses: 120,
          cuotaMensual: 850000,
        },
      ],
    };
    const pending = service.consultar();
    await Promise.resolve();
    const request = http.expectOne(
      (r) => r.url === 'http://localhost:8081/v1/creditos-hipotecarios',
    );
    expect(request.request.params.get('mercado')).toBe('CO');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    request.flush(response);
    expect(await pending).toEqual(response);
  });

  it('no consulta consentimientos cuando la sesión ha expirado', async () => {
    session.validAccessToken.and.resolveTo(null);
    await expectAsync(service.tieneConsentimientoFinanciero()).toBeRejectedWithError(
      'SESION_EXPIRADA',
    );
    http.expectNone('http://localhost:8081/v1/cuenta/consentimientos');
  });

  it('no consulta créditos cuando la sesión ha expirado', async () => {
    session.validAccessToken.and.resolveTo(null);
    await expectAsync(service.consultar()).toBeRejectedWithError('SESION_EXPIRADA');
    http.expectNone((r) => r.url === 'http://localhost:8081/v1/creditos-hipotecarios');
  });

  it('propaga fallos HTTP de la consulta de consentimientos', async () => {
    const pending = service.tieneConsentimientoFinanciero();
    await Promise.resolve();
    http
      .expectOne('http://localhost:8081/v1/cuenta/consentimientos')
      .flush({ message: 'No disponible' }, { status: 503, statusText: 'Unavailable' });
    await expectAsync(pending).toBeRejected();
  });

  it('propaga fallos HTTP de la consulta de créditos', async () => {
    const pending = service.consultar();
    await Promise.resolve();
    http
      .expectOne((r) => r.url === 'http://localhost:8081/v1/creditos-hipotecarios')
      .flush({ message: 'No disponible' }, { status: 503, statusText: 'Unavailable' });
    await expectAsync(pending).toBeRejected();
  });
});
