import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BFF_BASE_URL } from '../config/api.config';
import { DocumentosLegalesService } from './documentos-legales.service';
import { mockDocuments } from './documentos-legales.fixture';
describe('Documentos legales BFF', () => {
  let service: DocumentosLegalesService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BFF_BASE_URL, useValue: '/api/' },
      ],
    });
    service = TestBed.inject(DocumentosLegalesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta CO/es-CO una vez y conserva versiones distintas', () => {
    service.load();
    service.load();
    const req = http.expectOne((r) => r.url === '/api/v1/documentos-legales');
    expect(req.request.params.get('mercado')).toBe('CO');
    expect(req.request.params.get('idioma')).toBe('es-CO');
    req.flush(mockDocuments.map((d, i) => ({ ...d, version: `V${i + 1}` })));
    expect(service.ready()).toBeTrue();
    expect(service.document('open-data')?.version).toBe('V2');
    service.load();
    http.expectNone((r) => r.url === '/api/v1/documentos-legales');
  });
  it('permite reintentar un fallo sin sustituir por textos locales', () => {
    service.load();
    http
      .expectOne((r) => r.url === '/api/v1/documentos-legales')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.ready()).toBeFalse();
    expect(service.error()).toBeTruthy();
    service.load();
    http.expectOne((r) => r.url === '/api/v1/documentos-legales').flush(mockDocuments);
    expect(service.ready()).toBeTrue();
    expect(service.error()).toBe('');
  });
  for (const docs of [
    [],
    mockDocuments.slice(0, 2),
    [...mockDocuments, mockDocuments[0]],
    mockDocuments.map((d) => ({ ...d, version: 'invalid' })),
  ]) {
    it('rechaza respuestas incompletas, duplicadas o versiones inválidas', () => {
      service.load();
      http.expectOne((r) => r.url === '/api/v1/documentos-legales').flush(docs);
      expect(service.ready()).toBeFalse();
      expect(service.error()).toBeTruthy();
    });
  }
});
