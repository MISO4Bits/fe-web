import { firstValueFrom } from 'rxjs';
import { RegistrationMockService } from './registro-mock.service';
import { request } from './registro.fixture';

describe('RegistrationMockService', () => {
  let service: RegistrationMockService;
  beforeEach(() => {
    service = new RegistrationMockService();
  });
  it('crea una cuenta activa sin esperar confirmación ni permiso financiero', async () => {
    const r = await firstValueFrom(service.register(request));
    expect(r.status).toBe('ACTIVE');
    expect(r.emailConfirmed).toBeFalse();
    expect(r.financialConsent).toBeFalse();
  });
  it('acepta permiso financiero', async () => {
    const r = await firstValueFrom(
      service.register({ ...request, consents: { ...request.consents, financialData: true } }),
    );
    expect(r.financialConsent).toBeTrue();
  });
  for (const [email, document, code] of [
    ['sofia.pedraza@correo.com', '123456789', 'EMAIL_EXISTS'],
    ['martin@example.com', '1018456723', 'DOCUMENT_EXISTS'],
    ['test@mailinator.com', '123456789', 'DISPOSABLE_EMAIL'],
    ['error@solventa.test', '123456789', 'UNAVAILABLE'],
  ]) {
    it(`simula ${code}`, async () => {
      await expectAsync(
        firstValueFrom(
          service.register({
            ...request,
            email,
            identity: { ...request.identity, documentNumber: document },
          }),
        ),
      ).toBeRejectedWith(jasmine.objectContaining({ code }));
    });
  }
  it('detecta registro repetido en memoria', async () => {
    await firstValueFrom(service.register(request));
    await expectAsync(firstValueFrom(service.register(request))).toBeRejectedWith(
      jasmine.objectContaining({ code: 'EMAIL_EXISTS' }),
    );
  });
  for (const [token, code] of [
    ['expired', 'EXPIRED_TOKEN'],
    ['bad', 'INVALID_TOKEN'],
  ])
    it(`rechaza token ${token}`, async () => {
      await expectAsync(firstValueFrom(service.confirmEmail(token))).toBeRejectedWith(
        jasmine.objectContaining({ code }),
      );
    });
  it('confirma y reenvía en modo demo', async () => {
    expect(await firstValueFrom(service.confirmEmail('demo-valid'))).toEqual({
      email: 'demo@solventa.test',
    });
    expect(await firstValueFrom(service.resendEmail())).toBeUndefined();
  });
});
