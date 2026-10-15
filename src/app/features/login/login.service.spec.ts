import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { Sesion } from '../../nucleo/sesion/sesion';
import { LoginService } from './login.service';

describe('LoginService', () => {
  let service: LoginService;
  let http: HttpTestingController;
  let session: SessionService;
  let sesion: Sesion;
  const tokens = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600, tokenType: 'Bearer' as const };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BFF_BASE_URL, useValue: '/api' }],
    });
    service = TestBed.inject(LoginService);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    sesion = TestBed.inject(Sesion);
  });
  afterEach(() => http.verify());

  it('autentica, envía bearer al consultar cuenta y abre sesión', async () => {
    const result = service.ingresar('persona@correo.com', 'Clave123');
    const login = http.expectOne('/api/v1/sesiones');
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'persona@correo.com', password: 'Clave123' });
    login.flush(tokens);
    await Promise.resolve();
    const cuenta = http.expectOne('/api/v1/cuenta');
    expect(cuenta.request.headers.get('Authorization')).toBe('Bearer access');
    cuenta.flush({ clienteId: '1', primerNombre: 'Ana', email: 'persona@correo.com', estado: 'ACTIVO' });
    await result;
    expect(session.accessToken()).toBe('access');
    expect(sesion.actual()?.nombre).toBe('Ana');
  });

  it('no conserva sesión si falla autenticación', async () => {
    const result = service.ingresar('persona@correo.com', 'errada');
    http.expectOne('/api/v1/sesiones').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(result).toBeRejected();
    expect(session.accessToken()).toBeNull();
    expect(sesion.hayCliente()).toBeFalse();
  });

  it('limpia el token si falla consulta de cuenta', async () => {
    const result = service.ingresar('persona@correo.com', 'Clave123');
    http.expectOne('/api/v1/sesiones').flush(tokens);
    await Promise.resolve();
    http.expectOne('/api/v1/cuenta').flush({}, { status: 500, statusText: 'Server Error' });
    await expectAsync(result).toBeRejected();
    expect(session.accessToken()).toBeNull();
    expect(sesion.hayCliente()).toBeFalse();
  });
});
