import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';
import { DatosCreditoCotizacion } from '../cotizacion/cotizacion-api.service';

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
  cotizacionCreadaEn?: string;
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

export interface ResumenPolizaSolicitud extends PolizaSolicitud {
  datosCredito: DatosCreditoCotizacion;
  primaTotalMensual: number;
}

export interface CoberturaContratada {
  codigo: 'VIDA' | 'HOGAR';
  obligatoria: boolean;
  sumaAsegurada: number;
  primaNeta: number;
  iva: number;
  primaTotal: number;
}

export interface DetallePolizaSolicitud extends ResumenPolizaSolicitud {
  coberturas: CoberturaContratada[];
  moneda: 'COP';
}

export interface DocumentoPoliza {
  estado: 'GENERANDO' | 'LISTO';
  url?: string | null;
  expiraEn?: string | null;
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

  async listar(): Promise<ResumenPolizaSolicitud[]> {
    return firstValueFrom(
      this.http.get<ResumenPolizaSolicitud[]>(this.url, { headers: await this.headers() }),
    );
  }

  async consultarDetalle(id: string): Promise<DetallePolizaSolicitud> {
    return firstValueFrom(
      this.http.get<DetallePolizaSolicitud>(`${this.url}/${encodeURIComponent(id)}`, {
        headers: await this.headers(),
      }),
    );
  }

  async documento(id: string): Promise<DocumentoPoliza> {
    const respuesta = await firstValueFrom(
      this.http.get<DocumentoPoliza>(`${this.url}/${encodeURIComponent(id)}/documento`, {
        headers: await this.headers(),
        observe: 'response',
      }),
    );
    if (respuesta.status === 202) return { estado: 'GENERANDO' };
    if (!respuesta.body) throw new Error('DOCUMENTO_NO_DISPONIBLE');
    return respuesta.body;
  }

  async solicitar(solicitud: SolicitarPoliza): Promise<PolizaSolicitud> {
    return firstValueFrom(
      this.http.post<PolizaSolicitud>(this.url, solicitud, {
        headers: await this.headers(),
      }),
    );
  }
}
