import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { LayoutPrivado } from './layout-privado';
import { Sesion } from '../../nucleo/sesion/sesion';

describe('LayoutPrivado', () => {
  let sesion: Sesion;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPrivado],
      providers: [provideRouter([])],
    }).compileComponents();

    TestBed.inject(MatIconRegistry).addSvgIconSetLiteral(
      TestBed.inject(DomSanitizer).bypassSecurityTrustHtml(
        '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="plus" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol></svg>',
      ),
    );
    sesion = TestBed.inject(Sesion);
  });

  it('muestra el nombre de quien tiene la sesión', () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    const fixture = TestBed.createComponent(LayoutPrivado);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nombre').textContent).toContain('Sofía');
  });

  it('cierra la sesión y devuelve al inicio', async () => {
    sesion.abrir({ nombre: 'Sofía', correo: 'sofia@correo.com' });
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const fixture = TestBed.createComponent(LayoutPrivado);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.cliente button').click();

    expect(sesion.hayCliente()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
