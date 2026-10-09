import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RegistrationRequest, RegistrationResponse } from '../models/registro.model';

export interface AvailabilityQuery {
  correo?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

export interface RegistrationGateway {
  checkAvailability(
    query: AvailabilityQuery,
  ): Observable<{ correoDisponible?: boolean | null; documentoDisponible?: boolean | null }>;
  register(request: RegistrationRequest): Observable<RegistrationResponse>;
  confirmEmail(oobCode: string): Observable<{ email: string }>;
  resendEmail(email: string): Observable<void>;
}

export const REGISTRATION_GATEWAY = new InjectionToken<RegistrationGateway>('REGISTRATION_GATEWAY');
