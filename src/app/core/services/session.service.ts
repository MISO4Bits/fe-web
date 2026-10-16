import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../config/api.config';
import { RegistrationResponse } from '../../features/registro/models/registro.model';
import { BffSesion } from '../../features/registro/models/bff-registro.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/+$/, '');
  private refreshPending: Promise<string | null> | null = null;
  readonly account = signal<RegistrationResponse | null>(null);
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

  hasRefreshToken(): boolean {
    return !!this.credentials()?.refreshToken;
  }

  async validAccessToken(): Promise<string | null> {
    if (this.accessToken() && Date.now() < this.expiresAt - 30000) return this.accessToken();
    if (!this.credentials()?.refreshToken) return null;
    if (!this.refreshPending) {
      this.refreshPending = this.refresh().finally(() => {
        this.refreshPending = null;
      });
    }
    return this.refreshPending;
  }

  private async refresh(): Promise<string | null> {
    const refreshToken = this.credentials()?.refreshToken;
    if (!refreshToken) return null;
    try {
      const next = await firstValueFrom(
        this.http.post<BffSesion>(`${this.baseUrl}/v1/sesiones/refresco`, { refreshToken }),
      );
      this.setCredentials(next);
      return next.accessToken;
    } catch {
      this.clear();
      return null;
    }
  }

  clear() {
    this.credentials.set(null);
    this.expiresAt = 0;
    this.account.set(null);
  }
}
