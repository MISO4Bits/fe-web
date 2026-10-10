import { DocumentosLegalesService } from '../../../core/services/documentos-legales.service';
import { Component, inject, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { policies } from './policies';
let dialogSequence = 0;
export type PermissionKind = keyof typeof policies;
@Component({
  selector: 'app-permission-dialog',
  templateUrl: './permission-dialog.html',
  styleUrl: './permission-dialog.scss',
})
export class PermissionDialog {
  readonly legal = inject(DocumentosLegalesService);
  get document() {
    return this.legal.document(this.policy.type);
  }
  readonly headingId = `permission-title-${++dialogSequence}`;
  readonly accepted = output<PermissionKind>();
  readonly allowAcceptance = input(false);
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly kind = signal<PermissionKind>('terms');
  get policy() {
    return policies[this.kind()];
  }
  open(kind: PermissionKind) {
    this.kind.set(kind);
    this.legal.load();
    this.dialog().nativeElement.showModal();
  }
  close() {
    this.dialog().nativeElement.close();
  }
  accept() {
    if (!this.document || !this.allowAcceptance()) return;
    this.accepted.emit(this.kind());
    this.close();
  }
}
