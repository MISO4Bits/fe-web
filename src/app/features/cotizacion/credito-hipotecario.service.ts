import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

export interface ConsentimientoVista {
  scope: 'OPEN_FINANCE' | 'OPEN_DATA';
  estado: 'OTORGADO' | 'REVOCADO' | 'NO_OTORGADO';
  vigente: boolean;
}

export interface EntidadFinanciera {
  id: string;
  nombre: string;
}
export interface CreditoHipotecario {
  entidadId: string | null;
  entidadNombre: string;
  valorCredito: number;
  saldoInsoluto: number;
  plazoRestanteMeses: number;
  cuotaMensual: number;
}
export interface CreditosHipotecariosRespuesta {
  estado: 'DISPONIBLE' | 'SIN_HIPOTECAS' | 'SIN_CONSENTIMIENTO' | 'NO_DISPONIBLE';
  creditos: CreditoHipotecario[];
  entidades: EntidadFinanciera[];
  origen: 'OPEN_FINANCE';
  fechaConsulta: string | null;
}

@Injectable({ providedIn: 'root' })
export class CreditoHipotecarioService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/$/, '');

  /** Estado explícito de Open Finance, usado para seleccionar la variante de cotización. */
  async estadoConsentimientoFinanciero(): Promise<ConsentimientoVista['estado'] | null> {
    const token = await this.session.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    const consentimientos = await firstValueFrom(
      this.http.get<ConsentimientoVista[]>(`${this.baseUrl}/v1/cuenta/consentimientos`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      }),
    );
    return consentimientos.find((c) => c.scope === 'OPEN_FINANCE')?.estado ?? null;
  }

  async tieneConsentimientoFinanciero(): Promise<boolean> {
    const token = await this.session.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    const consentimientos = await firstValueFrom(
      this.http.get<ConsentimientoVista[]>(`${this.baseUrl}/v1/cuenta/consentimientos`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      }),
    );
    return consentimientos.some(
      (c) => c.scope === 'OPEN_FINANCE' && c.estado === 'OTORGADO' && c.vigente,
    );
  }

  async consultar(): Promise<CreditosHipotecariosRespuesta> {
    const token = await this.session.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    return firstValueFrom(
      this.http.get<CreditosHipotecariosRespuesta>(`${this.baseUrl}/v1/creditos-hipotecarios`, {
        params: { mercado: 'CO' },
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      }),
    );
  }
}
