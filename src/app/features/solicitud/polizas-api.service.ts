import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

export interface DocumentoAceptado {
  tipo: 'poliza';
  version: string;
}

export interface SolicitarPoliza {
  coberturas: ('VIDA' | 'HOGAR')[];
  cotizacionCreadaEn: string;
  documentosAceptados: DocumentoAceptado[];
}

export interface PolizaSolicitud {
  polizaId: string;
  numero?: string | null;
  estado: 'EMITIDA' | 'PENDIENTE' | 'RECHAZADA' | 'VENCIDA';
  solicitudVigenteHasta?: string | null;
  emitidaEn?: string | null;
  vigencia?: { desde: string; hasta: string } | null;
  rechazo?: { motivos: { codigo: string; mensaje: string }[]; rechazadaEn: string } | null;
  pendientes: {
    codigo: string;
    tipo: 'USUARIO' | 'AGENTE';
    mensaje: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class PolizasApiService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SessionService);
  private readonly url = `${inject(BFF_BASE_URL).replace(/\/$/, '')}/v1/cuenta/polizas`;

  private async headers(): Promise<HttpHeaders> {
    const token = await this.sesion.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  async consultar(id: string): Promise<PolizaSolicitud> {
    return firstValueFrom(
      this.http.get<PolizaSolicitud>(`${this.url}/${encodeURIComponent(id)}`, {
        headers: await this.headers(),
      }),
    );
  }

  async solicitar(solicitud: SolicitarPoliza): Promise<PolizaSolicitud> {
    return firstValueFrom(
      this.http.post<PolizaSolicitud>(this.url, solicitud, {
        headers: await this.headers(),
      }),
    );
  }
}
