import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutPublico } from './layout-publico';

describe('LayoutPublico', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPublico],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('ofrece ingresar y crear cuenta', () => {
    const fixture = TestBed.createComponent(LayoutPublico);
    fixture.detectChanges();
    const enlaces = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('nav a'),
    ).map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('/ingreso');
    expect(enlaces).toContain('/registro');
  });

  it('declara que el valor preliminar no es una oferta', () => {
    const fixture = TestBed.createComponent(LayoutPublico);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pie').textContent).toContain(
      'no constituyen una oferta',
    );
  });
});
