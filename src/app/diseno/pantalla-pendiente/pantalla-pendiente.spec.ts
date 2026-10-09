import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { PantallaPendiente } from './pantalla-pendiente';

describe('PantallaPendiente', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PantallaPendiente] }).compileComponents();
    TestBed.inject(MatIconRegistry).addSvgIconSetLiteral(
      TestBed.inject(DomSanitizer).bypassSecurityTrustHtml(
        '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="browsers" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol></svg>',
      ),
    );
  });

  it('nombra la pantalla del prototipo y la historia que la entrega', () => {
    const fixture = TestBed.createComponent(PantallaPendiente);
    fixture.componentRef.setInput('pantalla', '01 Landing con precotización');
    fixture.componentRef.setInput('historia', 'BITS-258');
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('01 Landing con precotización');
    expect(texto).toContain('BITS-258');
  });
});
