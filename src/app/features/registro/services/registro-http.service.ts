import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, switchMap, throwError, timeout } from 'rxjs';
import { apiConfig, BFF_BASE_URL } from '../../../core/config/api.config';
import { SessionService } from '../../../core/services/session.service';
import {
  BffCuenta,
  BffDisponibilidad,
  BffRegistroRequest,
  BffRegistroResponse,
} from '../models/bff-registro.model';
import {
  RegistrationError,
  RegistrationErrorCode,
  RegistrationRequest,
  RegistrationResponse,
} from '../models/registro.model';
import { AvailabilityQuery, RegistrationGateway } from './registro.gateway';

@Injectable({ providedIn: 'root' })
export class RegistrationHttpService implements RegistrationGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/+$/, '');
  private readonly session = inject(SessionService);

  checkAvailability(query: AvailabilityQuery): Observable<BffDisponibilidad> {
    return this.http
      .get<BffDisponibilidad>(`${this.baseUrl}/v1/registro/disponibilidad`, {
        params: { ...query },
      })
      .pipe(
        timeout(apiConfig.timeoutMs),
        catchError((error: unknown) => this.mapError(error)),
      );
  }

  register(request: RegistrationRequest): Observable<RegistrationResponse> {
    const body: BffRegistroRequest = {
      email: request.email,
      password: request.password,
      tipoDocumento: request.identity.documentType as BffRegistroRequest['tipoDocumento'],
      numeroDocumento: request.identity.documentNumber,
      primerNombre: request.identity.firstName,
      primerApellido: request.identity.lastName,
      fechaNacimiento: request.identity.birthDate,
      telefono: request.phone || null,
      politicaVersion: request.consents.version,
      aceptaTerminos: request.consents.terms,
      autorizaTratamientoDatos: request.consents.personalData,
      politicaVersionTratamientoDatos: request.consents.personalData
        ? request.consents.personalVersion
        : null,
      autorizaDatosFinancieros: request.consents.financialData,
      politicaVersionDatosFinancieros: request.consents.financialData
        ? request.consents.financialVersion
        : null,
    };
    return this.http
      .get<BffDisponibilidad>(`${this.baseUrl}/v1/registro/disponibilidad`, {
        params: {
          correo: body.email,
          tipoDocumento: body.tipoDocumento,
          numeroDocumento: body.numeroDocumento,
        },
      })
      .pipe(
        timeout(apiConfig.timeoutMs),
        switchMap((availability) => {
          if (availability.correoDisponible === false)
            return throwError(() => new RegistrationError('EMAIL_EXISTS'));
          if (availability.documentoDisponible === false)
            return throwError(() => new RegistrationError('DOCUMENT_EXISTS'));
          return this.http
            .post<BffRegistroResponse>(`${this.baseUrl}/v1/registro`, body)
            .pipe(timeout(apiConfig.timeoutMs));
        }),
        map((response) => {
          if (response.cuenta.estado !== 'ACTIVO') throw new RegistrationError('UNAVAILABLE');
          this.session.setCredentials(response.sesion);
          return {
            customerId: response.cuenta.clienteId,
            status: 'ACTIVE' as const,
            emailConfirmed: response.cuenta.correoConfirmado ?? false,
            email: response.cuenta.email,
            financialConsent: request.consents.financialData,
          };
        }),
        catchError((error: unknown) => this.mapError(error)),
      );
  }

  confirmEmail(token: string): Observable<void> {
    // Convención provisional: el token del enlace se envía como Bearer.
    // El contrato solo declara Authorization; validar su significado con el BFF.
    return this.http
      .post<BffCuenta>(`${this.baseUrl}/v1/registro/confirmacion`, null, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      })
      .pipe(
        timeout(apiConfig.timeoutMs),
        map((account) => {
          if (!account.correoConfirmado) throw new RegistrationError('INVALID_TOKEN');
        }),
        catchError((error: unknown) => this.mapError(error)),
      );
  }

  resendEmail(email: string): Observable<void> {
    // La interfaz demo recibe email; el contrato HTTP identifica al usuario por sesión.
    void email;
    const token = this.session.accessToken();
    if (!token) return throwError(() => new RegistrationError('SESSION_REQUIRED'));
    return this.http
      .post<void>(`${this.baseUrl}/v1/registro/reenvio-confirmacion`, null, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      })
      .pipe(
        timeout(apiConfig.timeoutMs),
        catchError((error: unknown) => this.mapError(error)),
      );
  }

  private mapError(error: unknown): Observable<never> {
    if (error instanceof RegistrationError) return throwError(() => error);
    const codes: RegistrationErrorCode[] = [
      'EMAIL_EXISTS',
      'DOCUMENT_EXISTS',
      'DISPOSABLE_EMAIL',
      'INVALID_TOKEN',
      'EXPIRED_TOKEN',
    ];
    const response = error instanceof HttpErrorResponse ? error : null;
    const code = response?.error?.code;
    // Los códigos de negocio aún no están documentados; solo reconocer los conocidos.
    const mapped = codes.includes(code)
      ? code
      : response?.status === 422
        ? 'VALIDATION'
        : response?.status === 401
          ? 'SESSION_REQUIRED'
          : 'UNAVAILABLE';
    return throwError(() => new RegistrationError(mapped));
  }
}
