import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

export type TipoEvidencia = 'cedula_frente' | 'cedula_reverso' | 'selfie';
export type EstadoEvidencia = 'PENDIENTE' | 'ACEPTADA' | 'REINTENTAR' | 'REVISION_MANUAL';
export type MotivoEvidencia =
  | 'BORROSA'
  | 'OSCURA'
  | 'REFLEJO'
  | 'RECORTADA'
  | 'NO_ES_CEDULA'
  | 'SIN_ROSTRO'
  | 'VARIOS_ROSTROS'
  | 'POSIBLE_SUPLANTACION'
  | 'NO_COINCIDE_CON_CEDULA';
export interface Evidencia {
  tipo: TipoEvidencia;
  estado: EstadoEvidencia;
  evidenciaId?: string | null;
  motivo?: MotivoEvidencia | null;
  intentosRestantes: number;
}

@Injectable({ providedIn: 'root' })
export class EvidenciasApiService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SessionService);
  private readonly url = `${inject(BFF_BASE_URL).replace(/\/$/, '')}/v1/cuenta/evidencias-identidad`;

  private async headers(): Promise<HttpHeaders> {
    const token = await this.sesion.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  async consultar(): Promise<Evidencia[]> {
    return firstValueFrom(this.http.get<Evidencia[]>(this.url, { headers: await this.headers() }));
  }

  async subir(tipo: TipoEvidencia, imagen: File): Promise<Evidencia> {
    const body = new FormData();
    body.append('tipo', tipo);
    body.append('imagen', imagen);
    // El navegador fija el boundary multipart. No enviar número de documento ni veredictos.
    return firstValueFrom(
      this.http.post<Evidencia>(this.url, body, { headers: await this.headers() }),
    );
  }
}
