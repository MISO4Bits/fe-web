import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

/** Ruta del sprite que genera tools/build-icons.mjs. */
export const SPRITE = 'iconos/solventa.svg';

/**
 * Registra el sprite del producto en Material. Con esto cualquier componente
 * usa <mat-icon svgIcon="check" /> y el icono toma el color del tema, porque
 * el sprite se dibuja con currentColor.
 *
 * Es un solo archivo para los catorce iconos: una peticion, no catorce.
 */
export function proveerIconos(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const registro = inject(MatIconRegistry);
    const sanitizador = inject(DomSanitizer);
    registro.addSvgIconSet(sanitizador.bypassSecurityTrustResourceUrl(SPRITE));
    // Evita que Material intente cargar la fuente de iconos que no usamos.
    registro.setDefaultFontSetClass('solventa-sin-fuente-de-iconos');
  });
}
