import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

export interface DatosCreditoCotizacion {
  entidadAcreedora: string;
  valorCredito: number;
  saldoInsoluto: number;
  plazoRestanteMeses: number;
}
export interface CotizacionRespuesta {
  estado: 'VIGENTE' | 'EXPIRADA';
  producto: 'VIDA_HIPOTECARIO';
  datosCredito: DatosCreditoCotizacion;
  origenDatos: 'DECLARADO';
  oferta: {
    primaMensual: number;
    primaBaseMensual: number;
    sumaAsegurada: number;
    coberturaMeses: number;
    moneda: 'COP';
    personalizado: boolean;
    fuentesNoDisponibles?: string[];
  };
  perfilRiesgo?: {
    nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
    factores: {
      descripcion: string;
      efecto: 'POSITIVO' | 'NEGATIVO';
      pesoRelativo?: number | null;
    }[];
  } | null;
  vigenciaCotizacion: { desde: string; hasta: string };
  creadaEn: string;
}
@Injectable({ providedIn: 'root' })
export class CotizacionApiService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SessionService);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/$/, '');
  private async headers(): Promise<HttpHeaders> {
    const token = await this.sesion.validAccessToken();
    if (!token) throw new Error('SESION_EXPIRADA');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
  async crear(datosCredito: DatosCreditoCotizacion): Promise<CotizacionRespuesta> {
    return firstValueFrom(
      this.http.post<CotizacionRespuesta>(
        `${this.baseUrl}/v1/cotizaciones`,
        { datosCredito },
        { headers: await this.headers() },
      ),
    );
  }
  async actual(): Promise<CotizacionRespuesta | null> {
    return firstValueFrom(
      this.http.get<CotizacionRespuesta | null>(`${this.baseUrl}/v1/cotizaciones/actual`, {
        headers: await this.headers(),
      }),
    );
  }
}
