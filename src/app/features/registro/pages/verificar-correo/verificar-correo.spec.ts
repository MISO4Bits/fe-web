import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { VERIFICATION_CODE } from '../../../../core/services/verification-code';
import { SessionService } from '../../../../core/services/session.service';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';
import { VerificarCorreo } from './verificar-correo';

describe('VerificarCorreo', () => {
  function setup(code: string | null = 'valid-code-123') {
    const result = new Subject<{ email: string }>();
    const confirmEmail = jasmine.createSpy('confirmEmail').and.returnValue(result);
    TestBed.configureTestingModule({
      providers: [
        { provide: VERIFICATION_CODE, useValue: () => code },
        { provide: REGISTRATION_GATEWAY, useValue: { confirmEmail } },
      ],
    });
    const fixture = TestBed.createComponent(VerificarCorreo);
    return {
      page: fixture.componentInstance,
      fixture,
      result,
      confirmEmail,
      session: TestBed.inject(SessionService),
    };
  }
  it('no llama al BFF sin un código válido', () => {
    const { page, confirmEmail } = setup('short');
    expect(page.state()).toBe('invalid');
    expect(confirmEmail).not.toHaveBeenCalled();
  });
  it('impide llamadas simultáneas y no crea sesión al confirmar desde otro navegador', () => {
    const { page, result, confirmEmail, session } = setup();
    page.verify();
    expect(confirmEmail).toHaveBeenCalledTimes(1);
    result.next({ email: 'otro@example.com' });
    result.complete();
    page.verify();
    expect(confirmEmail).toHaveBeenCalledTimes(1);
    expect(page.state()).toBe('success');
    expect(session.account()).toBeNull();
  });
  it('no confirma una cuenta diferente a la del enlace', () => {
    const { result, session } = setup();
    session.account.set({
      customerId: '1',
      status: 'ACTIVE',
      email: 'actual@example.com',
      emailConfirmed: false,
      financialConsent: false,
    });
    result.next({ email: 'otro@example.com' });
    expect(session.account()?.emailConfirmed).toBeFalse();
  });
  it('permite reintentar únicamente los errores temporales con el mismo código', () => {
    const { page, result, confirmEmail } = setup();
    result.error(new RegistrationError('UNAVAILABLE'));
    expect(page.state()).toBe('error');
    const retry = new Subject<{ email: string }>();
    confirmEmail.and.returnValue(retry);
    page.verify();
    expect(confirmEmail.calls.allArgs()).toEqual([['valid-code-123'], ['valid-code-123']]);
    retry.error(new RegistrationError('EXPIRED_TOKEN'));
    page.verify();
    expect(page.state()).toBe('used');
    expect(confirmEmail).toHaveBeenCalledTimes(2);
  });
});
