import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Estado } from './estado';

function registrarIconos(): void {
  const registro = TestBed.inject(MatIconRegistry);
  const sanitizador = TestBed.inject(DomSanitizer);
  registro.addSvgIconSetLiteral(
    sanitizador.bypassSecurityTrustHtml(
      '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<symbol id="error" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol>' +
        '<symbol id="browsers" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol>' +
        '</svg>',
    ),
  );
}

describe('Estado', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Estado] }).compileComponents();
    registrarIconos();
  });

  it('muestra un indicador mientras carga', () => {
    const fixture = TestBed.createComponent(Estado);
    fixture.componentRef.setInput('tipo', 'cargando');
    fixture.componentRef.setInput('titulo', 'Consultando tu banco');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
  });

  it('marca el error para que se distinga del vacío', () => {
    const fixture = TestBed.createComponent(Estado);
    fixture.componentRef.setInput('tipo', 'error');
    fixture.componentRef.setInput('titulo', 'No pudimos traer tus datos');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.es-error')).toBeTruthy();
  });

  it('ofrece la acción solo cuando se la dan', () => {
    const fixture = TestBed.createComponent(Estado);
    fixture.componentRef.setInput('tipo', 'vacio');
    fixture.componentRef.setInput('titulo', 'Todavía no tienes cotizaciones');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    let llamada = 0;
    fixture.componentRef.setInput('accion', 'Cotizar');
    fixture.componentRef.setInput('alAccionar', () => (llamada += 1));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    expect(llamada).toBe(1);
  });
});
