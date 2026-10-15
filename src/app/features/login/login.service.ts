import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { Sesion } from '../../nucleo/sesion/sesion';
import { BffCuenta, BffSesion } from '../registro/models/bff-registro.model';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/+$/, '');
  private readonly tokens = inject(SessionService);
  private readonly sesion = inject(Sesion);

  async ingresar(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<BffSesion>(`${this.baseUrl}/v1/sesiones`, { email, password }),
    );
    this.tokens.setCredentials(tokens);
    try {
      const cuenta = await firstValueFrom(
        this.http.get<BffCuenta>(`${this.baseUrl}/v1/cuenta`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }),
      );
      this.sesion.abrir({ nombre: cuenta.primerNombre, correo: cuenta.email });
    } catch (error) {
      this.tokens.clear();
      throw error;
    }
  }
}
