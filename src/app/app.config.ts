import { registerLocaleData } from '@angular/common';
import localeCo from '@angular/common/locales/es-CO';
registerLocaleData(localeCo, 'es-CO');
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { apiConfig, BFF_BASE_URL } from './core/config/api.config';
import { REGISTRATION_GATEWAY } from './features/registro/services/registro.gateway';
import { RegistrationMockService } from './features/registro/services/registro-mock.service';
import { RegistrationHttpService } from './features/registro/services/registro-http.service';
import { proveerIconos } from './nucleo/iconos/proveer-iconos';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: BFF_BASE_URL, useValue: apiConfig.baseUrl },
    {
      provide: REGISTRATION_GATEWAY,
      useClass: apiConfig.useMocks ? RegistrationMockService : RegistrationHttpService,
    },
    provideRouter(routes, withComponentInputBinding()),
    // Material carga el sprite de iconos con HttpClient.
    provideHttpClient(withFetch()),
    proveerIconos(),
  ],
};
