import { registerLocaleData } from '@angular/common';
import localeCo from '@angular/common/locales/es-CO';
registerLocaleData(localeCo, 'es-CO');
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { apiConfig, BFF_BASE_URL } from './core/config/api.config';
import { REGISTRATION_GATEWAY } from './features/registro/services/registro.gateway';
import { RegistrationMockService } from './features/registro/services/registro-mock.service';
import { RegistrationHttpService } from './features/registro/services/registro-http.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: BFF_BASE_URL, useValue: apiConfig.baseUrl },
    {
      provide: REGISTRATION_GATEWAY,
      useClass: apiConfig.useMocks ? RegistrationMockService : RegistrationHttpService,
    },
  ],
};
