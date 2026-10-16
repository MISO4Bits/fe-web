import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });
  it('muestra bienvenida y seguros vacíos', () => {
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes seguros');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
  });
  it('cierra el popup sin eliminar el Home', () => {
    fixture.nativeElement.querySelector('button.close').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no tienes seguros ni cotizaciones',
    );
  });
  it('permite cotizar desde Home y bienvenida', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(
      links.filter((link) => link.getAttribute('href') === '/cuenta/cotizaciones/nueva').length,
    ).toBe(3);
  });
});
