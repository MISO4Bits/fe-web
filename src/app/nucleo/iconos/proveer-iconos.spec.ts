import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatIconRegistry } from '@angular/material/icon';
import { proveerIconos, SPRITE } from './proveer-iconos';
import { ICONOS } from './iconos';

describe('proveerIconos', () => {
  it('registra el sprite del producto en Material', () => {
    const registro = jasmine.createSpyObj<MatIconRegistry>('MatIconRegistry', [
      'addSvgIconSet',
      'setDefaultFontSetClass',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: MatIconRegistry, useValue: registro },
        proveerIconos(),
      ],
    });
    TestBed.inject(MatIconRegistry);
    TestBed.tick();

    expect(registro.addSvgIconSet).toHaveBeenCalledTimes(1);
    const recurso = registro.addSvgIconSet.calls.mostRecent().args[0];
    expect(String(recurso)).toContain(SPRITE);
  });
});

describe('catalogo de iconos', () => {
  it('declara los catorce iconos que usan las pantallas del Sprint 1', () => {
    expect(ICONOS.length).toBe(14);
  });

  it('no repite nombres', () => {
    expect(new Set(ICONOS).size).toBe(ICONOS.length);
  });
});
