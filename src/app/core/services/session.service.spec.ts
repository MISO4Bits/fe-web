import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BFF_BASE_URL } from '../config/api.config';
import { SessionService } from './session.service';

describe('SessionService (tokens y renovación)', () => {
  let service: SessionService;
  let http: HttpTestingController;
  let now: number;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BFF_BASE_URL, useValue: '/api' }] });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
    now = Date.now();
    spyOn(Date, 'now').and.callFake(() => now);
  });
  afterEach(() => http.verify());
  const initial = { accessToken: 'token-1', refreshToken: 'refresh-1', expiresIn: 120 };

  it('usa access token vigente sin pedir refresh', async () => {
    service.setCredentials(initial);
    expect(await service.validAccessToken()).toBe('token-1');
    http.expectNone('/api/v1/sesiones/refresco');
  });

  it('renueva cuando faltan menos de 30 segundos', async () => {
    service.setCredentials(initial);
    now += 95_000;
    const result = service.validAccessToken();
    const request = http.expectOne('/api/v1/sesiones/refresco');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
    request.flush({ accessToken: 'token-2', refreshToken: 'refresh-2', expiresIn: 3600 });
    expect(await result).toBe('token-2');
    expect(service.accessToken()).toBe('token-2');
  });

  it('comparte un solo refresh entre solicitudes simultáneas', async () => {
    service.setCredentials(initial);
    now += 119_000;
    const a = service.validAccessToken();
    const b = service.validAccessToken();
    const request = http.expectOne('/api/v1/sesiones/refresco');
    request.flush({ accessToken: 'token-2', refreshToken: 'refresh-2', expiresIn: 3600 });
    expect(await Promise.all([a, b])).toEqual(['token-2', 'token-2']);
  });

  it('limpia tokens cuando falla el refresh', async () => {
    service.setCredentials(initial);
    now += 121_000;
    const result = service.validAccessToken();
    http.expectOne('/api/v1/sesiones/refresco').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBeNull();
    expect(service.hasRefreshToken()).toBeFalse();
    expect(service.accessToken()).toBeNull();
  });

  it('sin refresh token no intenta renovar', async () => {
    expect(await service.validAccessToken()).toBeNull();
    http.expectNone('/api/v1/sesiones/refresco');
  });

  it('clear elimina tokens y cuenta', () => {
    service.setCredentials(initial);
    service.clear();
    expect(service.accessToken()).toBeNull();
    expect(service.hasRefreshToken()).toBeFalse();
  });
});
