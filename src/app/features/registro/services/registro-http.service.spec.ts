import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BFF_BASE_URL } from '../../../core/config/api.config';
import { SessionService } from '../../../core/services/session.service';
import { RegistrationHttpService } from './registro-http.service';
import { request } from './registro.fixture';

const response = {
  cuenta: {
    clienteId: '1',
    primerNombre: 'Martín',
    primerApellido: 'Flores',
    email: request.email,
    estado: 'ACTIVO',
    correoConfirmado: false,
  },
  sesion: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 },
};
describe('RegistrationHttpService — contrato BFF', () => {
  let service: RegistrationHttpService;
  let http: HttpTestingController;
  let session: SessionService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: '/api/' },
      ],
    });
    service = TestBed.inject(RegistrationHttpService);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });
  afterEach(() => http.verify());
  function available() {
    const check = http.expectOne((r) => r.url === '/api/v1/registro/disponibilidad');
    expect(check.request.params.get('correo')).toBe(request.email);
    expect(check.request.params.get('numeroDocumento')).toBe(request.identity.documentNumber);
    check.flush({ correoDisponible: true, documentoDisponible: true });
  }
  it('continúa con el POST si falla la comprobación previa', () => {
    service.register(request).subscribe((account) => expect(account.customerId).toBe('1'));
    http
      .expectOne((r) => r.url.endsWith('/disponibilidad'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    const registration = http.expectOne('/api/v1/registro');
    expect(registration.request.method).toBe('POST');
    registration.flush(response);
  });
  it('consulta disponibilidad, envía solo el DTO del BFF y conserva la sesión en memoria', () => {
    service.register(request).subscribe((r) =>
      expect(r).toEqual({
        customerId: '1',
        status: 'ACTIVE',
        emailConfirmed: false,
        email: request.email,
        financialConsent: false,
      }),
    );
    available();
    const req = http.expectOne('/api/v1/registro');
    expect(req.request.body).toEqual({
      email: request.email,
      password: request.password,
      tipoDocumento: 'CC',
      numeroDocumento: request.identity.documentNumber,
      primerNombre: 'Martín',
      primerApellido: 'Flores',
      fechaNacimiento: '1985-08-02',
      telefono: request.phone,
      politicaVersion: request.consents.version,
      aceptaTerminos: true,
      autorizaTratamientoDatos: true,
      politicaVersionTratamientoDatos: request.consents.personalVersion,
      autorizaDatosFinancieros: false,
      politicaVersionDatosFinancieros: null,
    });
    req.flush(response);
    expect(session.accessToken()).toBe('access');
  });
  for (const [key, code] of [
    ['correoDisponible', 'EMAIL_EXISTS'],
    ['documentoDisponible', 'DOCUMENT_EXISTS'],
  ]) {
    it(`impide el envío cuando ${key} es falso`, () => {
      service.register(request).subscribe({ error: (e) => expect(e.code).toBe(code) });
      http.expectOne((r) => r.url.endsWith('/disponibilidad')).flush({ [key]: false });
      http.expectNone('/api/v1/registro');
    });
  }
  it('no interpreta null como un duplicado; registra autorización financiera y teléfono obligatorio', () => {
    service
      .register({
        ...request,
        consents: { ...request.consents, personalData: false, financialData: true },
      })
      .subscribe();
    http.expectOne((r) => r.url.endsWith('/disponibilidad')).flush({ correoDisponible: null });
    const req = http.expectOne('/api/v1/registro');
    expect(req.request.body.telefono).toBe(request.phone);
    expect(req.request.body.politicaVersionTratamientoDatos).toBeNull();
    expect(req.request.body.politicaVersionDatosFinancieros).toBe(
      request.consents.financialVersion,
    );
    req.flush(response);
  });
  for (const [status, body, code] of [
    [422, { detail: [{ input: 'secret', msg: 'private' }] }, 'VALIDATION'],
    [503, {}, 'UNAVAILABLE'],
    [409, { code: 'EMAIL_EXISTS' }, 'EMAIL_EXISTS'],
    [401, {}, 'SESSION_REQUIRED'],
  ] as const) {
    it(`controla respuesta ${status} sin mostrar datos sensibles`, () => {
      service.register(request).subscribe({ error: (e) => expect(e.code).toBe(code) });
      available();
      http.expectOne('/api/v1/registro').flush(body, { status, statusText: 'Error' });
    });
  }
  it('no establece una sesión para una cuenta bloqueada', () => {
    service.register(request).subscribe({ error: (e) => expect(e.code).toBe('UNAVAILABLE') });
    available();
    http
      .expectOne('/api/v1/registro')
      .flush({ ...response, cuenta: { ...response.cuenta, estado: 'BLOQUEADO' } });
    expect(session.accessToken()).toBeNull();
  });
  it('confirma públicamente con oobCode', () => {
    service.confirmEmail('confirmation').subscribe();
    const c = http.expectOne('/api/v1/registro/confirmacion');
    expect(c.request.headers.has('Authorization')).toBeFalse();
    expect(c.request.body).toEqual({ oobCode: 'confirmation' });
    c.flush({ ...response.cuenta, correoConfirmado: true });
  });
  it('no reporta éxito si el BFF no confirmó el correo', () => {
    service
      .confirmEmail('invalid')
      .subscribe({ error: (e) => expect(e.code).toBe('INVALID_TOKEN') });
    http.expectOne('/api/v1/registro/confirmacion').flush(response.cuenta);
  });
  it('controla confirmación expirada', () => {
    service
      .confirmEmail('expired')
      .subscribe({ error: (e) => expect(e.code).toBe('EXPIRED_TOKEN') });
    http
      .expectOne('/api/v1/registro/confirmacion')
      .flush({ code: 'EXPIRED_TOKEN' }, { status: 410, statusText: 'Gone' });
    session.clear();
    expect(session.account()).toBeNull();
  });
  it('reutiliza la clave al reintentar y la cambia al modificar datos o completar el registro', () => {
    function attempt(email: string, success = false) {
      service.register({ ...request, email }).subscribe({ error: () => undefined });
      http
        .expectOne((r) => r.url.endsWith('/disponibilidad'))
        .flush({ correoDisponible: true, documentoDisponible: true });
      const r = http.expectOne('/api/v1/registro');
      const key = r.request.headers.get('Idempotency-Key');
      expect(key?.length).toBeLessThanOrEqual(64);
      if (success) r.flush(response);
      else r.flush({}, { status: 503, statusText: 'Unavailable' });
      return key;
    }
    const first = attempt(request.email);
    expect(attempt(request.email)).toBe(first);
    const changed = attempt('otro@example.com');
    expect(changed).not.toBe(first);
    expect(attempt('otro@example.com', true)).toBe(changed);
    expect(attempt('otro@example.com')).not.toBe(changed);
  });
  for (const [status, code] of [
    [400, 'INVALID_TOKEN'],
    [422, 'EXPIRED_TOKEN'],
    [503, 'UNAVAILABLE'],
  ] as const) {
    it(`clasifica confirmación ${status}`, () => {
      service.confirmEmail('demo-valid').subscribe({ error: (e) => expect(e.code).toBe(code) });
      http
        .expectOne('/api/v1/registro/confirmacion')
        .flush({ detail: 'privado' }, { status, statusText: 'Error' });
    });
  }
});
