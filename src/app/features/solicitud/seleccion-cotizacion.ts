import { CotizacionRespuesta } from '../cotizacion/cotizacion-api.service';

export interface SeleccionCotizacion {
  cotizacionCreadaEn: string;
  hogarSeleccionado: boolean;
  condicionesAceptadas: boolean;
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
