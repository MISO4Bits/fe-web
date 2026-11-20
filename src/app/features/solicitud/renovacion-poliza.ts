import { PolizaSolicitud, RenovacionPoliza } from './polizas-api.service';

const fechaColombia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' });

export function plazoRenovacionAbierto(renovacion: RenovacionPoliza): boolean {
  const limite = Date.parse(renovacion.decidirHasta);
  // svc-core cierra las decisiones desde el inicio del día límite en Colombia.
  return Number.isFinite(limite) && fechaColombia.format(new Date()) < fechaColombia.format(limite);
}

export function insigniaSeguro(poliza: PolizaSolicitud): string {
  if (poliza.estado === 'DESACTIVADA') return 'Desactivada';
  const renovacion = poliza.renovacion;
  if (renovacion?.estado === 'RECHAZADA') return 'No se renueva';
  if (renovacion?.estado === 'SIN_RESPUESTA' && plazoRenovacionAbierto(renovacion)) {
    return 'Por renovar';
  }
  return 'Vigente';
}
