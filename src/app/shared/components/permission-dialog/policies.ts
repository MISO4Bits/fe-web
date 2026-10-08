export const policies = {
  terms: { type: 'terminos', badge: 'PERMISO OBLIGATORIO', action: 'Entendido, acepto' },
  personal: { type: 'open-data', badge: 'PERMISO OBLIGATORIO', action: 'Autorizo el tratamiento' },
  financial: { type: 'open-finance', badge: 'PERMISO OPCIONAL', action: 'Autorizo la consulta' },
} as const;
