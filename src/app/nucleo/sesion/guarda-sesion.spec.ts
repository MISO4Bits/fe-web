import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type CanActivateFn } from '@angular/router';
import { provideRouter } from '@angular/router';
import { guardaSesion } from './guarda-sesion';
import { Sesion } from './sesion';

function ejecutar(guarda: CanActivateFn, url: string) {
  return TestBed.runInInjectionContext(() => guarda({} as never, { url } as never));
}

describe('guardaSesion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('deja pasar cuando hay sesión', () => {
    TestBed.inject(Sesion).abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    expect(ejecutar(guardaSesion, '/cuenta')).toBeTrue();
  });

  it('manda al registro cuando no hay sesión', () => {
    const resultado = ejecutar(guardaSesion, '/cuenta');
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toContain('/registro');
  });

  it('recuerda a dónde iba la persona', () => {
    const resultado = ejecutar(guardaSesion, '/cuenta/cotizaciones/nueva') as UrlTree;
    const url = TestBed.inject(Router).serializeUrl(resultado);
    expect(url).toContain('destino=%2Fcuenta%2Fcotizaciones%2Fnueva');
  });
});
