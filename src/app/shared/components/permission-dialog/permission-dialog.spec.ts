import { provideHttpClient } from '@angular/common/http';
import { BFF_BASE_URL } from '../../../core/config/api.config';
import { DocumentosLegalesService } from '../../../core/services/documentos-legales.service';
import { mockDocuments } from '../../../core/services/documentos-legales.fixture';
import { TestBed } from '@angular/core/testing';
import { PermissionDialog } from './permission-dialog';

describe('PermissionDialog', () => {
  it('abre el permiso solicitado, emite aceptación y cierra el modal', () => {
    TestBed.configureTestingModule({
      imports: [PermissionDialog],
      providers: [provideHttpClient(), { provide: BFF_BASE_URL, useValue: '/api' }],
    });
    TestBed.inject(DocumentosLegalesService).documents.set(mockDocuments);
    const fixture = TestBed.createComponent(PermissionDialog);
    fixture.componentRef.setInput('allowAcceptance', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const accepted = jasmine.createSpy();
    component.accepted.subscribe(accepted);
    component.open('financial');
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('Consulta en centrales de riesgo');
    fixture.nativeElement.querySelector('button.primary').click();
    expect(accepted).toHaveBeenCalledWith('financial');
    expect(dialog.open).toBeFalse();
    component.open('personal');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button.close').click();
    expect(dialog.open).toBeFalse();
  });
  it('la consulta informativa no otorga permiso ni muestra aceptación', () => {
    TestBed.configureTestingModule({
      imports: [PermissionDialog],
      providers: [provideHttpClient(), { provide: BFF_BASE_URL, useValue: '/api' }],
    });
    TestBed.inject(DocumentosLegalesService).documents.set(mockDocuments);
    const fixture = TestBed.createComponent(PermissionDialog);
    fixture.detectChanges();
    fixture.componentInstance.open('terms');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.primary')).toBeNull();
    fixture.componentInstance.close();
  });
});
