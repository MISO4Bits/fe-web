import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Login } from './login';
import { LoginService } from './login.service';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let service: jasmine.SpyObj<LoginService>;
  let router: Router;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    service = jasmine.createSpyObj<LoginService>('LoginService', ['ingresar']);

    service.ingresar.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [{ provide: LoginService, useValue: service }, provideRouter([])],
    }).compileComponents();
    router = TestBed.inject(Router);
    navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  const fill = (fixture: ComponentFixture<Login>, email = ' persona@correo.com ') => {
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    inputs[0].value = email;
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = 'Clave12345';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('muestra el formulario y la recuperación pendiente', () => {
    expect(fixture.nativeElement.textContent).toContain('Entra a tu cuenta');
    expect(fixture.nativeElement.querySelector('.olvido').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('input[placeholder]')).toHaveSize(0);
  });

  it('no consulta el BFF con campos vacíos o correo inválido', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.ingresar');
    button.click();
    await fixture.whenStable();
    expect(service.ingresar).not.toHaveBeenCalled();
    fill(fixture, 'invalido');
    button.click();
    await fixture.whenStable();
    expect(service.ingresar).not.toHaveBeenCalled();
  });

  it('envía credenciales y navega al Home', async () => {
    fill(fixture);
    fixture.nativeElement.querySelector('button.ingresar').click();
    await fixture.whenStable();
    expect(service.ingresar).toHaveBeenCalledOnceWith('persona@correo.com', 'Clave12345');
    expect(navigate).toHaveBeenCalledWith('/cuenta');
  });

  it('informa credenciales incorrectas sin navegar', async () => {
    service.ingresar.and.rejectWith(new HttpErrorResponse({ status: 401 }));
    fill(fixture);
    fixture.nativeElement.querySelector('button.ingresar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'incorrectos',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('informa rate limiting del backend', async () => {
    service.ingresar.and.rejectWith(new HttpErrorResponse({ status: 429 }));
    fill(fixture);
    fixture.nativeElement.querySelector('button.ingresar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Demasiados intentos',
    );
  });

  it('evita envíos simultáneos', async () => {
    let complete!: () => void;
    service.ingresar.and.returnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    fill(fixture);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.ingresar');
    button.click();
    button.click();
    expect(service.ingresar).toHaveBeenCalledTimes(1);
    complete();
    await fixture.whenStable();
  });
});
