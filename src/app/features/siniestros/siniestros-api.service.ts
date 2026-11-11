import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

export type EstadoSiniestro = 'EN_ESTUDIO' | 'FALTA_INFORMACION' | 'PAGADO' | 'RECHAZADO';
export type TipoSiniestro = 'INCAPACIDAD_TOTAL' | 'INCENDIO_TERREMOTO' | 'SISMO_PARAMETRICO';

export interface ResumenSiniestro {
  id: string;
  numero: string;
  polizaId: string;
  tipo: TipoSiniestro;
  automatico: boolean;
  estado: EstadoSiniestro;
  reportadoEn: string;
  actualizadoEn: string;
}

export interface Siniestro extends ResumenSiniestro {
  fechaOcurrencia: string;
  narracion?: string | null;
  ultimaEntregaEn: string;
  fechaLimite?: string | null;
  evidenciaPedida?: { detalle: string; pedidaEn: string } | null;
  motivoRechazo?: string | null;
  pago?: {
    pagadoEn: string;
    lineas: { beneficiario: 'BANCO' | 'CLIENTE'; valor: number; destino: string }[];
  } | null;
  archivos: { id: string; clase: 'FOTO' | 'DOCUMENTO'; entregadoEn: string }[];
  evento?: { fecha: string; municipio: string; magnitud: number } | null;
}

@Injectable({ providedIn: 'root' })
export class SiniestrosApiService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SessionService);
  private readonly url = `${inject(BFF_BASE_URL).replace(/\/$/, '')}/v1/cuenta/siniestros`;

  private async headers(): Promise<HttpHeaders> {
    const token = await this.sesion.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  async listar(): Promise<ResumenSiniestro[]> {
    return firstValueFrom(
      this.http.get<ResumenSiniestro[]>(this.url, { headers: await this.headers() }),
    );
  }

  async consultar(id: string): Promise<Siniestro> {
    return firstValueFrom(
      this.http.get<Siniestro>(`${this.url}/${encodeURIComponent(id)}`, {
        headers: await this.headers(),
      }),
    );
  }
}
