import { provideHttpClient } from '@angular/common/http';
import { BFF_BASE_URL } from '../../../../core/config/api.config';
import { DocumentosLegalesService } from '../../../../core/services/documentos-legales.service';
import { mockDocuments } from '../../../../core/services/documentos-legales.fixture';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { CrearCuenta } from './crear-cuenta';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';
import { SessionService } from '../../../../core/services/session.service';

describe('CrearCuenta', () => {
  let page: CrearCuenta;
  let fixture: ComponentFixture<CrearCuenta>;
  let gateway: { register: jasmine.Spy; checkAvailability: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  const values = {
    firstName: 'Martín',
    lastName: 'Flores',
    documentType: 'CC',
    documentNumber: '123456789',
    birthDate: '02/08/1985',
    phone: '3001234567',
    email: 'martin@example.com',
    password: 'ClaveDemo123',
    terms: true,
    personalData: true,
    financialData: false,
  };
  beforeEach(() => {
    gateway = {
      checkAvailability: jasmine
        .createSpy()
        .and.returnValue(of({ correoDisponible: true, documentoDisponible: true })),
      register: jasmine.createSpy().and.returnValue(
        of({
          customerId: '1',
          status: 'ACTIVE',
          emailConfirmed: false,
          email: values.email,
          financialConsent: false,
        }),
      ),
    };
    router = { navigateByUrl: jasmine.createSpy().and.resolveTo(true) };
    TestBed.configureTestingModule({
      imports: [CrearCuenta],
      providers: [
        provideHttpClient(),
        { provide: BFF_BASE_URL, useValue: '/api' },
        { provide: REGISTRATION_GATEWAY, useValue: gateway },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.inject(DocumentosLegalesService).documents.set(mockDocuments);
    fixture = TestBed.createComponent(CrearCuenta);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.detectChanges();
  });
  it('rechaza vacíos y permisos sin enviar HTTP', () => {
    page.submit();
    expect(gateway.register).not.toHaveBeenCalled();
    expect(page.error()).toContain('Revisa');
    expect(page.invalid('email')).toBeTrue();
  });
  it('convierte la fecha y separa saldo de referencia; va a Home sin cotizar', () => {
    page.form.setValue(values);
    page.submit();
    expect(gateway.register.calls.mostRecent().args[0].identity.birthDate).toBe('1985-08-02');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/confirmar-correo');
    expect(TestBed.inject(SessionService).account()?.status).toBe('ACTIVE');
    expect(page.form.controls.password.value).toBe('');
    expect(page.busy()).toBeFalse();
  });
  for (const date of ['31/02/2000', 'not-a-date', '01/01/1800', '01/01/2999'])
    it(`rechaza fecha ${date}`, () => {
      page.form.setValue({ ...values, birthDate: date });
      expect(page.form.controls.birthDate.invalid).toBeTrue();
    });
  it('acepta permisos desde sus modales y permite omitir financiero', () => {
    page.accept('terms');
    page.accept('personal');
    page.accept('financial');
    expect(page.form.controls.terms.value).toBeTrue();
    expect(page.form.controls.personalData.value).toBeTrue();
    expect(page.form.controls.financialData.value).toBeTrue();
  });
  for (const code of [
    'EMAIL_EXISTS',
    'DOCUMENT_EXISTS',
    'DISPOSABLE_EMAIL',
    'UNAVAILABLE',
  ] as const)
    it(`conserva los datos frente a ${code}`, () => {
      gateway.register.and.returnValue(throwError(() => new RegistrationError(code)));
      page.form.setValue(values);
      page.submit();
      expect(page.form.controls.firstName.value).toBe('Martín');
      expect(page.error()).not.toBe('');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(page.busy()).toBeFalse();
    });
  it('controla errores no tipados y evita doble envío', () => {
    gateway.register.and.returnValue(throwError(() => new Error()));
    page.form.setValue(values);
    page.busy.set(true);
    page.submit();
    expect(gateway.register).not.toHaveBeenCalled();
    page.busy.set(false);
    page.submit();
    expect(page.error()).toContain('No pudimos');
    page.form.controls.email.setValue('new@example.com');
    expect(page.error()).toBe('');
  });
  it('valida cédula numérica de 4 a 10 dígitos y otros documentos alfanuméricos hasta 16', () => {
    const control = page.form.controls.documentNumber;
    for (const value of ['1234', '1234567890']) {
      control.setValue(value);
      expect(control.valid).toBeTrue();
    }
    for (const value of ['12', '123', '12345678901', 'ABC', '12%3', "123'", '1.234']) {
      control.setValue(value);
      expect(control.invalid).toBeTrue();
    }
    for (const type of ['CE', 'PA']) {
      page.form.controls.documentType.setValue(type);
      expect(control.value).toBe('');
      for (const value of ['AB12', 'AB123', 'A123456789012345']) {
        control.setValue(value);
        expect(control.valid).toBeTrue();
      }
      for (const value of [
        '',
        'A',
        'AB1',
        'A1234567890123456',
        'AB-123',
        'AB_123',
        'AB%123',
        'AB.123',
      ]) {
        control.setValue(value);
        expect(control.invalid).toBeTrue();
      }
    }
  });
  it('muestra puntos pero conserva la cédula sin separadores y elimina caracteres ajenos', () => {
    const input = fixture.nativeElement.querySelector('#documentNumber') as HTMLInputElement;
    input.value = '1.018.456.723';
    page.onDocumentInput({ target: input } as unknown as Event);
    expect(input.value).toBe('1.018.456.723');
    expect(page.form.controls.documentNumber.value).toBe('1018456723');
    input.value = "abc123%;_'<>";
    page.onDocumentInput({ target: input } as unknown as Event);
    expect(input.value).toBe('123');
    page.form.controls.documentType.setValue('PA');
    input.value = 'AB.123-%_';
    page.onDocumentInput({ target: input } as unknown as Event);
    expect(input.value).toBe('AB123');
  });
  it('limita el celular a 12 dígitos y exige la estructura de correo solicitada', () => {
    const input = fixture.nativeElement.querySelector('#phone') as HTMLInputElement;
    input.value = '+12 abc 3456789012345';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(input.value).toBe('123456789012');
    for (const value of ['a@b.c', 'a.b@c.d.co', 'a+b@c.co', 'a_b@c.co', 'a@b-c.co', 'a%z@b.co']) {
      page.form.controls.email.setValue(value);
      expect(page.form.controls.email.valid).toBeTrue();
    }
    for (const value of ['a@b', '@b.c', 'a@.c', 'a..b@c.co', 'a@b..co']) {
      page.form.controls.email.setValue(value);
      expect(page.form.controls.email.invalid).toBeTrue();
    }
    for (const value of ['', '123456', '+123', '1234567890123', '12a']) {
      page.form.controls.phone.setValue(value);
      expect(page.form.controls.phone.invalid).toBeTrue();
    }
    page.form.controls.phone.setValue('1234567');
    expect(page.form.controls.phone.valid).toBeTrue();
  });
  it('convierte selección de calendario al formato digitado y permite edición posterior', () => {
    const input = fixture.nativeElement.querySelector('input[type=date]') as HTMLInputElement;
    input.value = '1985-08-02';
    page.selectBirthDate({ target: input } as unknown as Event);
    expect(page.form.controls.birthDate.value).toBe('02/08/1985');
    page.form.controls.birthDate.setValue('03/08/1985');
    expect(page.form.controls.birthDate.valid).toBeTrue();
  });
  it('rechaza nombres vacíos de texto y caracteres de marcado', () => {
    for (const value of ['   ', '<script>', 'Ana%', 'Ana_']) {
      page.form.controls.firstName.setValue(value);
      expect(page.form.controls.firstName.invalid).toBeTrue();
    }
    page.form.controls.firstName.setValue('María José');
    expect(page.form.controls.firstName.valid).toBeTrue();
  });
  it('consulta al perder foco, omite inválidos y evita repetir el mismo valor', () => {
    page.form.controls.email.setValue('incorrecto');
    page.checkAvailability('email');
    expect(gateway.checkAvailability).not.toHaveBeenCalled();
    page.form.controls.email.setValue('martin@example.com');
    const input = fixture.nativeElement.querySelector('#email') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    page.checkAvailability('email');
    expect(gateway.checkAvailability).toHaveBeenCalledOnceWith({ correo: 'martin@example.com' });
    page.form.controls.documentNumber.setValue('1234567');
    page.checkAvailability('documentNumber');
    expect(gateway.checkAvailability).toHaveBeenCalledWith({
      tipoDocumento: 'CC',
      numeroDocumento: '1234567',
    });
  });
  it('bloquea duplicados y permite corregir el campo', () => {
    gateway.checkAvailability.and.returnValue(of({ correoDisponible: false }));
    page.form.setValue(values);
    page.checkAvailability('email');
    expect(page.form.controls.email.hasError('duplicate')).toBeTrue();
    page.submit();
    expect(gateway.register).not.toHaveBeenCalled();
    page.form.controls.email.setValue('otro@example.com');
    expect(page.form.controls.email.valid).toBeTrue();
  });
  it('descarta respuestas anteriores al editar o cambiar el tipo de documento', () => {
    const pending = new Subject<{ documentoDisponible: boolean }>();
    gateway.checkAvailability.and.returnValue(pending);
    page.form.controls.documentNumber.setValue('1234567');
    page.checkAvailability('documentNumber');
    expect(page.availabilityLoading().documentNumber).toBeTrue();
    page.form.controls.documentType.setValue('PA');
    pending.next({ documentoDisponible: false });
    expect(page.form.controls.documentNumber.hasError('duplicate')).toBeFalse();
    expect(page.availabilityLoading().documentNumber).toBeFalse();
  });
  it('permite reintentar errores y no considera disponible una respuesta sin booleano', () => {
    page.form.controls.email.setValue(values.email);
    gateway.checkAvailability.and.returnValue(throwError(() => new Error()));
    page.checkAvailability('email');
    expect(page.availabilityError().email).not.toBe('');
    gateway.checkAvailability.and.returnValue(of({ correoDisponible: null }));
    page.checkAvailability('email');
    expect(page.availabilityError().email).not.toBe('');
    gateway.checkAvailability.and.returnValue(of({ correoDisponible: true }));
    page.checkAvailability('email');
    expect(page.availabilityError().email).toBe('');
    expect(page.form.controls.email.valid).toBeTrue();
  });
  it('desmarca y deshabilita permisos cuando sus documentos dejan de estar disponibles', () => {
    page.form.setValue({ ...values, financialData: true });
    TestBed.inject(DocumentosLegalesService).documents.set([]);
    fixture.detectChanges();
    for (const name of ['terms', 'personalData', 'financialData'] as const) {
      expect(page.form.controls[name].value).toBeFalse();
      expect(page.form.controls[name].disabled).toBeTrue();
    }
  });
  it('habilita los permisos al recuperar los documentos sin aceptarlos automáticamente', () => {
    const legalDocs = TestBed.inject(DocumentosLegalesService);
    legalDocs.documents.set([]);
    fixture.detectChanges();
    legalDocs.documents.set(mockDocuments);
    fixture.detectChanges();
    for (const name of ['terms', 'personalData', 'financialData'] as const) {
      expect(page.form.controls[name].enabled).toBeTrue();
      expect(page.form.controls[name].value).toBeFalse();
    }
    expect(page.form.controls.terms.invalid).toBeTrue();
    expect(page.form.controls.personalData.valid).toBeTrue();
    expect(page.form.controls.financialData.valid).toBeTrue();
  });
  it('impide aceptar permisos y registrar sin documentos legales disponibles', () => {
    page.form.setValue(values);
    TestBed.inject(DocumentosLegalesService).documents.set([]);
    fixture.detectChanges();
    page.accept('terms');
    page.accept('personal');
    page.accept('financial');
    for (const name of ['terms', 'personalData', 'financialData'] as const) {
      expect(page.form.controls[name].value).toBeFalse();
    }
    page.submit();
    expect(gateway.register).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.error()).toContain('documentos legales');
  });
});
