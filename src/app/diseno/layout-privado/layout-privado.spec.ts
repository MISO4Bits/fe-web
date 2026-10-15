import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { LayoutPrivado } from './layout-privado';
import { Sesion } from '../../nucleo/sesion/sesion';

describe('LayoutPrivado', () => {
  let sesion: Sesion;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPrivado],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: BFF_BASE_URL, useValue: '/web' },
      ],
    }).compileComponents();
    sesion = TestBed.inject(Sesion);
  });

  it('muestra el encabezado y mantiene el menú cerrado inicialmente', () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    const fixture = TestBed.createComponent(LayoutPrivado);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.solventa-logo').textContent).toContain('Solventa');
    expect(fixture.nativeElement.querySelector('#menu-cuenta')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hamburguesa').getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('abre y cierra el menú hamburguesa', () => {
    const fixture = TestBed.createComponent(LayoutPrivado);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.hamburguesa');
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#menu-cuenta')).not.toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#menu-cuenta')).toBeNull();
  });

  it('cierra la sesión desde el menú y redirige al login', () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(LayoutPrivado);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.hamburguesa').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#menu-cuenta button').click();
    fixture.detectChanges();
    expect(sesion.hayCliente()).toBeFalse();
    expect(fixture.nativeElement.querySelector('#menu-cuenta')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/ingreso');
  });
});
