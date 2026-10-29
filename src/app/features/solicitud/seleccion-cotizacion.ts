import { CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';
import { DocumentoAceptado } from './polizas-api.service';

// Versión de las condiciones actuales, indicada en la evidencia de BITS-101.
export const VERSION_CONDICIONES_POLIZA = 'V1';

export interface SeleccionCotizacion {
  cotizacionCreadaEn: string;
  hogarSeleccionado: boolean;
  condicionesAceptadas: boolean;
  documentosAceptados?: DocumentoAceptado[];
}

export function seleccionVigente(
  estado: unknown,
  cotizacion: CotizacionRespuesta,
): SeleccionCotizacion | null {
  if (!estado || typeof estado !== 'object') return null;
  const valor = estado as Partial<SeleccionCotizacion>;
  if (
    valor.cotizacionCreadaEn !== cotizacion.creadaEn ||
    valor.condicionesAceptadas !== true ||
    typeof valor.hogarSeleccionado !== 'boolean'
  )
    return null;
  return valor as SeleccionCotizacion;
}
