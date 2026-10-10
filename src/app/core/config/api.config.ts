import { InjectionToken } from '@angular/core';

// Prefijo del BFF en el mismo origen. No agregar /v1 aquí.
export const apiConfig = {
  useMocks: false,
  baseUrl: '/web', // Proxy local y gateway en nube.
  timeoutMs: 10000,
  legalMarket: 'CO',
  legalLanguage: 'es-CO',
};
export const BFF_BASE_URL = new InjectionToken<string>('BFF_BASE_URL');
