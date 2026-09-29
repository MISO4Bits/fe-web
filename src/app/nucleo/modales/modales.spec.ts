import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Modales } from './modales';

@Component({ template: '<p>contenido</p>' })
class ModalDePrueba {}

describe('Modales', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('abre con las convenciones del producto', () => {
    const modales = TestBed.inject(Modales);
    const ref = modales.abrir(ModalDePrueba, { saldo: 320_000_000 });

    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(ref.componentInstance instanceof ModalDePrueba).toBeTrue();
    expect(ref.disableClose).toBeFalse();

    modales.cerrarTodos();
  });
});
