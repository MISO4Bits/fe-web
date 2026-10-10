import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, of, timeout } from 'rxjs';
import { apiConfig, BFF_BASE_URL } from '../config/api.config';
import { mockDocuments } from './documentos-legales.fixture';
export interface DocumentoLegal {
  tipo: string;
  version: string;
  titulo: string;
  subtitulo?: string | null;
  baseLegal: string;
  contenido: string;
  notaPie?: string | null;
}
@Injectable({ providedIn: 'root' })
export class DocumentosLegalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BFF_BASE_URL).replace(/\/+$/, '');
  readonly documents = signal<DocumentoLegal[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly ready = () => ['terminos', 'open-data', 'open-finance'].every((t) => this.document(t));
  document(type: string) {
    return this.documents().find((d) => d.tipo === type);
  }
  load() {
    if (this.loading() || this.ready()) return;
    this.loading.set(true);
    this.error.set('');
    const source = apiConfig.useMocks
      ? of(mockDocuments)
      : this.http.get<DocumentoLegal[]>(`${this.baseUrl}/v1/documentos-legales`, {
          params: { mercado: apiConfig.legalMarket, idioma: apiConfig.legalLanguage },
        });
    source
      .pipe(
        timeout(apiConfig.timeoutMs),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (docs) => {
          const valid =
            Array.isArray(docs) &&
            ['terminos', 'open-data', 'open-finance'].every((t) => {
              const matching = docs.filter((d) => d.tipo === t);
              const d = matching[0];
              return (
                matching.length === 1 &&
                d &&
                typeof d.version === 'string' &&
                /^V[1-9][0-9]*$/.test(d.version) &&
                d.version.length <= 20 &&
                typeof d.titulo === 'string' &&
                !!d.titulo.trim() &&
                typeof d.contenido === 'string' &&
                !!d.contenido.trim() &&
                typeof d.baseLegal === 'string'
              );
            });
          if (valid) this.documents.set(docs);
          else this.error.set('No pudimos cargar los documentos legales. Intenta nuevamente.');
        },
        error: () =>
          this.error.set('No pudimos cargar los documentos legales. Intenta nuevamente.'),
      });
  }
}
