import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { ICONOS } from '../nucleo/iconos/iconos';

interface RolDeColor {
  readonly nombre: string;
  readonly fondo: string;
  readonly texto: string;
}

interface Escala {
  readonly nombre: string;
  readonly clase: string;
}

/**
 * Pantalla de muestra del tema. Existe para comparar contra el prototipo:
 * reune los cinco componentes que usan las pantallas del Sprint 1, los roles
 * de color del esquema y la escala tipografica. No es una pantalla del
 * producto y no debe enlazarse desde la navegacion.
 */
@Component({
  selector: 'app-muestra-tema',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
  ],
  templateUrl: './muestra-tema.html',
  styleUrl: './muestra-tema.scss',
})
export class MuestraTema {
  protected readonly roles: readonly RolDeColor[] = [
    { nombre: 'primary', fondo: 'primary', texto: 'on-primary' },
    { nombre: 'primary-container', fondo: 'primary-container', texto: 'on-primary-container' },
    { nombre: 'secondary', fondo: 'secondary', texto: 'on-secondary' },
    {
      nombre: 'secondary-container',
      fondo: 'secondary-container',
      texto: 'on-secondary-container',
    },
    { nombre: 'tertiary', fondo: 'tertiary', texto: 'on-tertiary' },
    { nombre: 'tertiary-container', fondo: 'tertiary-container', texto: 'on-tertiary-container' },
    { nombre: 'error', fondo: 'error', texto: 'on-error' },
    { nombre: 'error-container', fondo: 'error-container', texto: 'on-error-container' },
    { nombre: 'surface', fondo: 'surface', texto: 'on-surface' },
    { nombre: 'surface-container', fondo: 'surface-container', texto: 'on-surface' },
    { nombre: 'surface-variant', fondo: 'surface-variant', texto: 'on-surface-variant' },
    { nombre: 'inverse-surface', fondo: 'inverse-surface', texto: 'inverse-on-surface' },
  ];

  protected readonly escalas: readonly Escala[] = [
    { nombre: 'display-large', clase: 'escala-display-large' },
    { nombre: 'headline-large', clase: 'escala-headline-large' },
    { nombre: 'headline-small', clase: 'escala-headline-small' },
    { nombre: 'title-large', clase: 'escala-title-large' },
    { nombre: 'title-medium', clase: 'escala-title-medium' },
    { nombre: 'body-large', clase: 'escala-body-large' },
    { nombre: 'body-medium', clase: 'escala-body-medium' },
    { nombre: 'label-large', clase: 'escala-label-large' },
    { nombre: 'label-small', clase: 'escala-label-small' },
  ];

  protected readonly iconos = ICONOS;

  protected readonly radios: readonly { token: string; etiqueta: string }[] = [
    { token: 'corner-extra-small', etiqueta: 'extra-small' },
    { token: 'corner-small', etiqueta: 'small' },
    { token: 'corner-medium', etiqueta: 'medium' },
    { token: 'corner-large', etiqueta: 'large' },
    { token: 'corner-extra-large', etiqueta: 'extra-large' },
  ];
}
