import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MuestraTema } from './muestra-tema';
import { ICONOS } from '../nucleo/iconos/iconos';

/**
 * En la prueba el sprite se registra literal, sin pasar por la red: lo que se
 * verifica aqui es que la pantalla pide los catorce iconos por su nombre.
 */
function spriteDePrueba(): string {
  const simbolos = ICONOS.map(
    (n) => `<symbol id="${n}" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg">${simbolos}</svg>`;
}

describe('MuestraTema', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MuestraTema],
    }).compileComponents();

    const registro = TestBed.inject(MatIconRegistry);
    const sanitizador = TestBed.inject(DomSanitizer);
    registro.addSvgIconSetLiteral(sanitizador.bypassSecurityTrustHtml(spriteDePrueba()));
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(MuestraTema);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pinta los roles de color con las variables del tema', () => {
    const fixture = TestBed.createComponent(MuestraTema);
    fixture.detectChanges();
    const roles = fixture.nativeElement.querySelectorAll('.rol');
    expect(roles.length).toBe(12);
    expect(roles[0].style.background).toContain('--mat-sys-primary');
  });

  it('pinta los catorce iconos del producto', () => {
    const fixture = TestBed.createComponent(MuestraTema);
    fixture.detectChanges();
    const iconos = fixture.nativeElement.querySelectorAll('.icono');
    expect(iconos.length).toBe(14);
    expect(iconos[0].querySelector('svg')).toBeTruthy();
  });

  it('pinta una fila por escala tipografica', () => {
    const fixture = TestBed.createComponent(MuestraTema);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.escala-display-large')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.escala-label-small')).toBeTruthy();
  });
});
