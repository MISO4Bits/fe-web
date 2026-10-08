import { TestBed } from '@angular/core/testing';
import { Sesion } from './sesion';

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
});
