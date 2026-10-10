import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, Observable, switchMap, throwError, timeout } from 'rxjs';
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

  private pendingRegistration: { body: string; key: string } | null = null;

  register(request: RegistrationRequest): Observable<RegistrationResponse> {
    const body: BffRegistroRequest = {
      email: request.email,
      password: request.password,
      tipoDocumento: request.identity.documentType as BffRegistroRequest['tipoDocumento'],
      numeroDocumento: request.identity.documentNumber,
      primerNombre: request.identity.firstName,
      primerApellido: request.identity.lastName,
      fechaNacimiento: request.identity.birthDate,
      telefono: request.phone,
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
    const serialized = JSON.stringify(body);
    if (this.pendingRegistration?.body !== serialized) {
      this.pendingRegistration = { body: serialized, key: crypto.randomUUID() };
    }
    const key = this.pendingRegistration.key;
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
        // La comprobación previa es orientativa; el POST valida duplicados de forma definitiva.
        catchError(() => of({} as BffDisponibilidad)),
        switchMap((availability) => {
          if (availability.correoDisponible === false)
            return throwError(() => new RegistrationError('EMAIL_EXISTS'));
          if (availability.documentoDisponible === false)
            return throwError(() => new RegistrationError('DOCUMENT_EXISTS'));
          return this.http
            .post<BffRegistroResponse>(`${this.baseUrl}/v1/registro`, body, {
              headers: { 'Idempotency-Key': key },
            })
            .pipe(timeout(apiConfig.timeoutMs));
        }),
        map((response) => {
          if (response.cuenta.estado !== 'ACTIVO') throw new RegistrationError('UNAVAILABLE');
          this.pendingRegistration = null;
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

  confirmEmail(oobCode: string): Observable<{ email: string }> {
    return this.http.post<BffCuenta>(`${this.baseUrl}/v1/registro/confirmacion`, { oobCode }).pipe(
      timeout(apiConfig.timeoutMs),
      map((account) => {
        if (
          account.correoConfirmado !== true ||
          typeof account.email !== 'string' ||
          !account.email
        )
          throw new RegistrationError('INVALID_TOKEN');
        return { email: account.email };
      }),
      catchError((error: unknown) => {
        // Los estados anunciados complementan el contrato; no se muestra el detail del BFF.
        if (error instanceof HttpErrorResponse && error.status === 400)
          return throwError(() => new RegistrationError('INVALID_TOKEN'));
        if (error instanceof HttpErrorResponse && error.status === 422)
          return throwError(() => new RegistrationError('EXPIRED_TOKEN'));
        return this.mapError(error);
      }),
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
