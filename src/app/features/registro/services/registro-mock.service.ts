import { Injectable } from '@angular/core';
import { delay, mergeMap, Observable, of, throwError } from 'rxjs';
import {
  RegistrationError,
  RegistrationRequest,
  RegistrationResponse,
} from '../models/registro.model';
import { AvailabilityQuery, RegistrationGateway } from './registro.gateway';

// Solo simulación local. No envía correos ni persiste identidad o contraseña.
@Injectable({ providedIn: 'root' })
export class RegistrationMockService implements RegistrationGateway {
  private readonly emails = new Set(['sofia.pedraza@correo.com']);
  private readonly documents = new Set(['1018456723']);

  checkAvailability(query: AvailabilityQuery) {
    return of({
      correoDisponible: query.correo ? !this.emails.has(query.correo.toLowerCase()) : null,
      documentoDisponible: query.numeroDocumento
        ? !this.documents.has(query.numeroDocumento)
        : null,
    }).pipe(delay(300));
  }

  register(request: RegistrationRequest): Observable<RegistrationResponse> {
    return of(request).pipe(
      delay(350),
      mergeMap((value) => {
        const email = value.email.toLowerCase();
        const document = value.identity.documentNumber;
        if (this.emails.has(email)) return throwError(() => new RegistrationError('EMAIL_EXISTS'));
        if (this.documents.has(document))
          return throwError(() => new RegistrationError('DOCUMENT_EXISTS'));
        if (
          ['mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com'].includes(
            email.split('@')[1],
          )
        ) {
          return throwError(() => new RegistrationError('DISPOSABLE_EMAIL'));
        }
        if (email === 'error@solventa.test')
          return throwError(() => new RegistrationError('UNAVAILABLE'));
        this.emails.add(email);
        this.documents.add(document);
        return of({
          customerId: 'demo-customer',
          status: 'ACTIVE' as const,
          emailConfirmed: false,
          email,
          financialConsent: value.consents.financialData,
        });
      }),
    );
  }

  confirmEmail(token: string): Observable<{ email: string }> {
    return of(token).pipe(
      delay(300),
      mergeMap((value) => {
        if (value === 'expired') return throwError(() => new RegistrationError('EXPIRED_TOKEN'));
        if (value !== 'demo-valid') return throwError(() => new RegistrationError('INVALID_TOKEN'));
        return of({ email: 'demo@solventa.test' });
      }),
    );
  }

  resendEmail(): Observable<void> {
    return of(undefined).pipe(delay(300));
  }
}
