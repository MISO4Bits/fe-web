import { TestBed } from '@angular/core/testing';
import { Sesion } from './sesion';
import { SessionService } from '../../core/services/session.service';

describe('Sesion', () => {
  let sesion: Sesion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sesion = TestBed.inject(Sesion);
  });

  it('arranca sin cliente', () => {
    expect(sesion.hayCliente()).toBeFalse();
    expect(sesion.actual()).toBeNull();
  });

  it('guarda al cliente cuando se abre', () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    expect(sesion.hayCliente()).toBeTrue();
    expect(sesion.actual()?.nombre).toBe('Sofía');
  });

  it('lo olvida cuando se cierra', () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    sesion.cerrar();
    expect(sesion.hayCliente()).toBeFalse();
  });
  it('reconoce la cuenta del registro y la limpia al cerrar', () => {
    const registro = TestBed.inject(SessionService);
    registro.account.set({
      customerId: '1',
      status: 'ACTIVE',
      emailConfirmed: false,
      email: 'demo@example.com',
      financialConsent: false,
    });
    expect(sesion.hayCliente()).toBeTrue();
    expect(sesion.actual()?.correo).toBe('demo@example.com');
    sesion.cerrar();
    expect(registro.account()).toBeNull();
    expect(sesion.hayCliente()).toBeFalse();
  });
});
