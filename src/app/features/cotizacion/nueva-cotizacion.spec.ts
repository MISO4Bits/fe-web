import { TestBed } from '@angular/core/testing';
import { NuevaCotizacion } from './nueva-cotizacion';
import {
  CreditoHipotecarioService,
  CreditosHipotecariosRespuesta,
} from './credito-hipotecario.service';
import { provideRouter } from '@angular/router';

const respuesta: CreditosHipotecariosRespuesta = {
  estado: 'DISPONIBLE',
  origen: 'OPEN_FINANCE',
  fechaConsulta: '2026-10-16T12:00:00Z',
  entidades: [{ id: 'b1', nombre: 'Bancolombia' }],
  creditos: [
    {
      entidadId: 'b1',
      entidadNombre: 'Bancolombia',
      valorCredito: 90000000,
      saldoInsoluto: 50000000,
      plazoRestanteMeses: 120,
      cuotaMensual: 850000,
    },
  ],
};

// Acceso tipado a los miembros protected del componente para pruebas unitarias.
// Evita `any` sin modificar la visibilidad de los miembros en producción.
interface CotizacionTestAccess {
  elegirBanco(nombre: string): void;
  continuar(): Promise<void>;
  volver(): void;
  cambiarBanco(): void;
  reintentar(): Promise<void>;
  fechaConsultaFormateada(): string | null;
  usarManual(): void;
  bancoFijado(): boolean;
  guardarManual(): void;
  guardarVerificado(): void;
  mensaje(): string;
  paso: { (): string; set(valor: 'consultando'): void };
  errores(): string[];
  erroresCampo(): Record<string, string>;
  limpiarErrorCampo(campo: string): void;
  guardado(): {
    entidadAcreedora: string;
    origen: 'VERIFICADO' | 'DECLARADO';
  } | null;
  manual: {
    entidadAcreedora: string;
    valorCredito: number | null;
    saldoInsoluto: number | null;
    plazoMeses: number | null;
  };
}

describe('NuevaCotizacion BITS-219', () => {
  let api: jasmine.SpyObj<CreditoHipotecarioService>;
  beforeEach(async () => {
    api = jasmine.createSpyObj<CreditoHipotecarioService>('CreditoHipotecarioService', [
      'consultar',
      'tieneConsentimientoFinanciero',
    ]);
    api.tieneConsentimientoFinanciero.and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [NuevaCotizacion],
      providers: [provideRouter([]), { provide: CreditoHipotecarioService, useValue: api }],
    }).compileComponents();
  });

  it('no consulta al banco antes de seleccionar y continuar', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    fixture.detectChanges();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button.primario').disabled).toBeTrue();
  });

  it('muestra datos verificados para la entidad seleccionada', async () => {
    api.consultar.and.resolveTo(respuesta);
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as {
      elegirBanco: (name: string) => void;
      continuar: () => Promise<void>;
      guardarVerificado: () => void;
      guardado: () => { origen: string } | null;
    };
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tu crédito hipotecario');
    component.guardarVerificado();
    expect(component.guardado()?.origen).toBe('VERIFICADO');
  });

  it('muestra un modal con indicador de carga mientras consulta al banco', async () => {
    let completarConsulta!: (value: CreditosHipotecariosRespuesta) => void;
    api.consultar.and.returnValue(
      new Promise((resolve) => {
        completarConsulta = resolve;
      }),
    );
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as {
      elegirBanco: (name: string) => void;
      continuar: () => Promise<void>;
    };
    component.elegirBanco('Bancolombia');
    const pendiente = component.continuar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    await Promise.resolve();
    completarConsulta(respuesta);
    await pendiente;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ofrece captura manual cuando no hay consentimiento', async () => {
    api.tieneConsentimientoFinanciero.and.resolveTo(false);
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as {
      elegirBanco: (name: string) => void;
      continuar: () => Promise<void>;
    };
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Escribe los datos de tu crédito');
    expect(api.consultar).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement.querySelector('#entidad-manual') as HTMLInputElement).readOnly,
    ).toBeTrue();
  });

  it('permite la opción mi banco no está sin consultar al BFF', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as {
      elegirBanco: (name: string) => void;
    };
    component.elegirBanco('__OTRO__');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Escribe los datos de tu crédito');
    expect(
      (fixture.nativeElement.querySelector('#entidad-manual') as HTMLInputElement).readOnly,
    ).toBeFalse();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(api.tieneConsentimientoFinanciero).not.toHaveBeenCalled();
  });

  it('valida el monto mínimo en captura manual', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as {
      usarManual: () => void;
      guardarManual: () => void;
      manual: {
        entidadAcreedora: string;
        valorCredito: number;
        saldoInsoluto: number;
        plazoMeses: number;
      };
      errores: () => string[];
    };
    component.usarManual();
    component.manual.entidadAcreedora = 'Bancolombia';
    component.manual.valorCredito = 9000000;
    component.manual.saldoInsoluto = 3000000;
    component.manual.plazoMeses = 120;
    component.guardarManual();
    expect(component.errores().join(' ')).toContain('10.000.000');
  });

  it('regresa a elegir banco y limpia el mensaje después de una consulta fallida', async () => {
    api.consultar.and.resolveTo({ ...respuesta, estado: 'SIN_HIPOTECAS', creditos: [] });
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    expect(component.mensaje()).toContain('No encontramos');
    component.volver();
    expect(component.paso()).toBe('banco');
    expect(component.mensaje()).toBe('');
  });

  it('guarda datos declarados válidos para un banco no listado', () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('__OTRO__');
    expect(component.bancoFijado()).toBeFalse();
    component.manual.entidadAcreedora = '  Banco de prueba  ';
    component.manual.valorCredito = 80000000;
    component.manual.saldoInsoluto = 40000000;
    component.manual.plazoMeses = 180;
    component.guardarManual();
    expect(component.errores()).toEqual([]);
    expect(component.guardado()).toEqual(
      jasmine.objectContaining({
        entidadAcreedora: 'Banco de prueba',
        origen: 'DECLARADO',
        fechaConsulta: null,
        valorCredito: 80000000,
        saldoInsoluto: 40000000,
        plazoMeses: 180,
      }),
    );
  });

  it('mantiene el banco seleccionado al guardar datos declarados', () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('BBVA Colombia');
    component.usarManual();
    expect(component.bancoFijado()).toBeTrue();
    component.manual.entidadAcreedora = 'Otro banco';
    component.manual.valorCredito = 10000000;
    component.manual.saldoInsoluto = 1000000;
    component.manual.plazoMeses = 12;
    component.guardarManual();
    const guardado = component.guardado();

    expect(guardado).not.toBeNull();
    expect(guardado?.entidadAcreedora).toBe('BBVA Colombia');
  });

  it('valida entidad, saldo y plazo antes de guardar el crédito manual', () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.manual.entidadAcreedora = 'X';
    component.manual.valorCredito = 20000000;
    component.manual.saldoInsoluto = 0;
    component.manual.plazoMeses = 481;
    component.guardarManual();
    expect(component.errores().length).toBe(3);
    expect(component.guardado()).toBeNull();
  });

  it('no guarda un crédito verificado si no hay crédito seleccionado', () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.guardarVerificado();
    expect(component.guardado()).toBeNull();
  });

  it('muestra ingreso manual cuando Open Finance responde sin consentimiento', async () => {
    api.consultar.and.resolveTo({ ...respuesta, estado: 'SIN_CONSENTIMIENTO', creditos: [] });
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    expect(component.paso()).toBe('manual');
    expect(component.mensaje()).toContain('No hay autorización vigente');
    expect(component.manual.entidadAcreedora).toBe('Bancolombia');
  });

  it('muestra ingreso manual cuando el banco no devuelve datos disponibles', async () => {
    api.consultar.and.resolveTo({ ...respuesta, estado: 'NO_DISPONIBLE', creditos: [] });
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    expect(component.paso()).toBe('manual');
    expect(component.mensaje()).toContain('No fue posible obtener');
  });

  it('maneja errores del BFF y cierra el estado de consulta', async () => {
    api.consultar.and.rejectWith(new Error('SERVICIO_NO_DISPONIBLE'));
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    expect(component.paso()).toBe('manual');
    expect(component.mensaje()).toContain('No pudimos consultar');
  });

  it('informa cuando la sesión ha expirado', async () => {
    api.tieneConsentimientoFinanciero.and.rejectWith(new Error('SESION_EXPIRADA'));
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    expect(component.paso()).toBe('manual');
    expect(component.mensaje()).toContain('Tu sesión ha expirado');
    expect(api.consultar).not.toHaveBeenCalled();
  });

  it('ignora la consulta sin banco o mientras ya está consultando', async () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    await component.continuar();
    expect(api.tieneConsentimientoFinanciero).not.toHaveBeenCalled();
    component.elegirBanco('Bancolombia');
    component.paso.set('consultando');
    await component.continuar();
    expect(api.consultar).not.toHaveBeenCalled();
  });
  it('AC-3: reintenta con el banco seleccionado tras un error', async () => {
    api.consultar.and.rejectWith(new Error('SERVICIO_NO_DISPONIBLE'));
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(botones.some((b) => b.textContent?.trim() === 'Reintentar')).toBeTrue();
    api.consultar.and.resolveTo(respuesta);
    await component.reintentar();
    expect(api.consultar).toHaveBeenCalledTimes(2);
    expect(component.paso()).toBe('datos');
  });

  it('AC-3: permite cambiar de banco después de un error', async () => {
    api.consultar.and.rejectWith(new Error('SERVICIO_NO_DISPONIBLE'));
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(botones.some((b) => b.textContent?.trim() === 'Cambiar de banco')).toBeTrue();
    component.cambiarBanco();
    fixture.detectChanges();
    expect(component.paso()).toBe('banco');
    expect((fixture.nativeElement.querySelector('#banco') as HTMLSelectElement).value).toBe('');
  });

  it('AC-2: muestra fecha de consulta del BFF en horario colombiano', async () => {
    api.consultar.and.resolveTo(respuesta);
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(component.fechaConsultaFormateada()).toContain('16 de octubre de 2026');
    expect(fixture.nativeElement.textContent).toContain('Fecha de consulta:');
  });

  it('no presenta al cliente notas sobre otras historias', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('se implementa en otra historia');
  });
  it('AC-5: rechaza un saldo superior al monto original y marca el campo', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.manual.entidadAcreedora = 'Otra entidad';
    component.manual.valorCredito = 200000000;
    component.manual.saldoInsoluto = 250000000;
    component.manual.plazoMeses = 180;
    component.guardarManual();
    fixture.detectChanges();
    expect(component.guardado()).toBeNull();
    expect(component.erroresCampo()['saldo']).toContain('no puede superar');
    const saldo = fixture.nativeElement.querySelector('#saldo') as HTMLInputElement;
    expect(saldo.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#error-saldo').textContent).toContain(
      'no puede superar',
    );
  });

  it('AC-5: permite saldo igual al monto original', () => {
    const component = TestBed.createComponent(NuevaCotizacion)
      .componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.manual.entidadAcreedora = 'Otra entidad';
    component.manual.valorCredito = 200000000;
    component.manual.saldoInsoluto = 200000000;
    component.manual.plazoMeses = 180;
    component.guardarManual();
    expect(component.erroresCampo()['saldo']).toBeUndefined();
    expect(component.guardado()?.origen).toBe('DECLARADO');
  });

  it('AC-5: marca errores por campo y los limpia al corregir el valor', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.guardarManual();
    fixture.detectChanges();
    expect(component.erroresCampo()['entidad']).toBeDefined();
    expect(component.erroresCampo()['valor']).toBeDefined();
    expect(component.erroresCampo()['saldo']).toBeDefined();
    expect(component.erroresCampo()['plazo']).toBeDefined();
    expect(
      (fixture.nativeElement.querySelector('#valor-credito') as HTMLInputElement).getAttribute(
        'aria-invalid',
      ),
    ).toBe('true');
    component.limpiarErrorCampo('valor');
    fixture.detectChanges();
    expect(component.erroresCampo()['valor']).toBeUndefined();
    expect(
      (fixture.nativeElement.querySelector('#valor-credito') as HTMLInputElement).getAttribute(
        'aria-invalid',
      ),
    ).toBeNull();
  });

  it('AC-5: al editar el saldo conserva los errores de los otros campos', async () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.guardarManual();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const saldo = fixture.nativeElement.querySelector('#saldo') as HTMLInputElement;
    saldo.value = '1000000';
    saldo.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erroresCampo()['saldo']).toBeUndefined();
    expect(component.erroresCampo()['entidad']).toBeDefined();
    expect(component.erroresCampo()['valor']).toBeDefined();
    expect(component.erroresCampo()['plazo']).toBeDefined();
    expect(component.errores().length).toBe(3);
    expect(saldo.getAttribute('aria-invalid')).toBeNull();
  });

  it('AC-5: al editar monto y plazo limpia únicamente sus mensajes mediante la interfaz', async () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.usarManual();
    component.guardarManual();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const monto = fixture.nativeElement.querySelector('#valor-credito') as HTMLInputElement;
    monto.value = '20000000';
    monto.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.erroresCampo()['valor']).toBeUndefined();
    expect(component.erroresCampo()['saldo']).toBeDefined();

    const plazo = fixture.nativeElement.querySelector('#plazo') as HTMLInputElement;
    plazo.value = '120';
    plazo.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.erroresCampo()['plazo']).toBeUndefined();
    expect(component.erroresCampo()['saldo']).toBeDefined();
    expect(component.erroresCampo()['entidad']).toBeDefined();
  });

  it('permite cambiar de banco desde Mi banco no está sin llamar al BFF', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('__OTRO__');
    fixture.detectChanges();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(botones.some((b) => b.textContent?.trim() === 'Reintentar')).toBeFalse();
    const cambiar = botones.find((b) => b.textContent?.trim() === 'Cambiar de banco');
    expect(cambiar).toBeDefined();
    cambiar?.click();
    fixture.detectChanges();
    expect(component.paso()).toBe('banco');
    expect(api.consultar).not.toHaveBeenCalled();
  });

  it('permite cambiar de banco desde los datos verificados', async () => {
    api.consultar.and.resolveTo(respuesta);
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(botones.some((b) => b.textContent?.trim() === 'Reintentar')).toBeFalse();
    botones.find((b) => b.textContent?.trim() === 'Cambiar de banco')?.click();
    fixture.detectChanges();
    expect(component.paso()).toBe('banco');
    expect((fixture.nativeElement.querySelector('#banco') as HTMLSelectElement).value).toBe('');
  });

  it('no ofrece Reintentar si el banco no tiene créditos', async () => {
    api.consultar.and.resolveTo({ ...respuesta, estado: 'SIN_HIPOTECAS', creditos: [] });
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(component.mensaje()).toContain('No encontramos');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
    expect(fixture.nativeElement.textContent).toContain('Cambiar de banco');
  });

  it('no ofrece Reintentar si no hay consentimiento y no consulta créditos', async () => {
    api.tieneConsentimientoFinanciero.and.resolveTo(false);
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
    expect(fixture.nativeElement.textContent).toContain('Cambiar de banco');
    expect(api.consultar).not.toHaveBeenCalled();
    await component.reintentar();
    expect(api.tieneConsentimientoFinanciero).toHaveBeenCalledTimes(1);
  });

  it('distingue un resultado disponible sin hipoteca del error técnico', async () => {
    api.consultar.and.resolveTo({ ...respuesta, estado: 'DISPONIBLE', creditos: [] });
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    component.elegirBanco('Bancolombia');
    await component.continuar();
    fixture.detectChanges();
    expect(component.mensaje()).toContain('No encontramos');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
  });

  it('AC-5: selecciona Otra entidad desde el desplegable y valida el formulario con submit', () => {
    const fixture = TestBed.createComponent(NuevaCotizacion);
    const component = fixture.componentInstance as unknown as CotizacionTestAccess;
    fixture.detectChanges();

    const banco = fixture.nativeElement.querySelector('#banco') as HTMLSelectElement;
    banco.value = '__OTRO__';
    banco.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(component.paso()).toBe('manual');

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(component.erroresCampo()['entidad']).toBeDefined();
    expect(component.erroresCampo()['valor']).toBeDefined();
    expect(component.guardado()).toBeNull();
  });
});
