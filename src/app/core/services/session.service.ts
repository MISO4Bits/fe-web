import { Injectable, signal } from '@angular/core';
import { RegistrationResponse } from '../../features/registro/models/registro.model';
import { BffSesion } from '../../features/registro/models/bff-registro.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly account = signal<RegistrationResponse | null>(null);
  readonly creditBalance = signal(320_000_000);
  // Tokens solo en memoria: recargar requiere una nueva sesión.
  private readonly credentials = signal<BffSesion | null>(null);
  private expiresAt = 0;

  setCredentials(value: BffSesion) {
    this.credentials.set(value);
    this.expiresAt = Date.now() + value.expiresIn * 1000;
  }

  accessToken(): string | null {
    return Date.now() < this.expiresAt ? (this.credentials()?.accessToken ?? null) : null;
  }

  clear() {
    this.credentials.set(null);
    this.expiresAt = 0;
    this.account.set(null);
  }
}
