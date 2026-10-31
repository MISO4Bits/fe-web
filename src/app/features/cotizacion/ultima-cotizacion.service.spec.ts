import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Sesion } from '../../nucleo/sesion/sesion';
import { UltimaCotizacionService } from './ultima-cotizacion.service';

describe('UltimaCotizacionService', () => {
  const usuarioA = 'ultima-cotizacion-a@example.com';
  const usuarioB = 'ultima-cotizacion-b@example.com';
  const claveA = `solventa.ultima-cotizacion-creada:${usuarioA}`;
  const claveB = `solventa.ultima-cotizacion-creada:${usuarioB}`;
  const fecha = '2026-10-31T12:00:00Z';
  const cliente = signal<{ correo: string } | null>(null);

  function configurar() {
    TestBed.configureTestingModule({
      providers: [{ provide: Sesion, useValue: { actual: cliente.asReadonly() } }],
    });
    return TestBed.inject(UltimaCotizacionService);
  }
  beforeEach(() => {
    localStorage.removeItem(claveA);
    localStorage.removeItem(claveB);
    cliente.set({ correo: usuarioA });
  });
  afterEach(() => {
    localStorage.removeItem(claveA);
    localStorage.removeItem(claveB);
  });

  it('recupera la última fecha del navegador al reiniciar la aplicación', () => {
    configurar().recordar(fecha);
    expect(localStorage.getItem(claveA)).toBe(String(Date.parse(fecha)));
    TestBed.resetTestingModule();
    expect(configurar().creadaEn()).toBe(Date.parse(fecha));
  });

  it('separa las fechas por usuario y normaliza su correo', () => {
    cliente.set({ correo: ` ${usuarioA.toUpperCase()} ` });
    const servicio = configurar();
    servicio.recordar(fecha);
    cliente.set({ correo: usuarioB });
    expect(servicio.creadaEn()).toBe(0);
    servicio.recordar('2026-11-01T12:00:00Z');
    cliente.set({ correo: usuarioA });
    expect(servicio.creadaEn()).toBe(Date.parse(fecha));
    cliente.set(null);
    expect(servicio.creadaEn()).toBe(0);
  });

  it('no reemplaza una fecha reciente por una anterior', () => {
    const servicio = configurar();
    servicio.recordar(fecha);
    servicio.recordar('2026-10-30T12:00:00Z');
    expect(servicio.creadaEn()).toBe(Date.parse(fecha));
    expect(localStorage.getItem(claveA)).toBe(String(Date.parse(fecha)));
  });

  it('respeta una fecha más reciente guardada por otra pestaña', () => {
    const servicio = configurar();
    servicio.recordar(fecha);
    localStorage.setItem(claveA, String(Date.parse('2026-11-02T12:00:00Z')));
    servicio.recordar('2026-11-01T12:00:00Z');
    expect(servicio.creadaEn()).toBe(Date.parse('2026-11-02T12:00:00Z'));
  });

  it('ignora fechas inválidas y recupera un registro corrupto', () => {
    localStorage.setItem(claveA, 'invalido');
    const servicio = configurar();
    expect(servicio.creadaEn()).toBe(0);
    servicio.recordar('fecha-invalida');
    expect(servicio.creadaEn()).toBe(0);
    servicio.recordar(fecha);
    expect(servicio.creadaEn()).toBe(Date.parse(fecha));
  });

  it('conserva la fecha durante la sesión si localStorage está bloqueado', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    const servicio = configurar();
    servicio.recordar(fecha);
    expect(servicio.creadaEn()).toBe(Date.parse(fecha));
  });

  it('no guarda fechas sin una cuenta identificada', () => {
    cliente.set(null);
    const servicio = configurar();
    servicio.recordar(fecha);
    expect(servicio.creadaEn()).toBe(0);
    expect(localStorage.getItem(claveA)).toBeNull();
  });
});
