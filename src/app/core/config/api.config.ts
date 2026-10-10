import { InjectionToken } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

// La URL base se reemplaza al construir para el entorno de nube.
export const apiConfig = {
  useMocks: false,
  baseUrl: API_BASE_URL,
  timeoutMs: 10000,
  legalMarket: 'CO',
  legalLanguage: 'es-CO',
};
export const BFF_BASE_URL = new InjectionToken<string>('BFF_BASE_URL');
