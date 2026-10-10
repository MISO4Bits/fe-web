import { DocumentosLegalesService } from '../../../../core/services/documentos-legales.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { SessionService } from '../../../../core/services/session.service';
import {
  PermissionDialog,
  PermissionKind,
} from '../../../../shared/components/permission-dialog/permission-dialog';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';

function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const value = String(control.value);
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!parts) return { date: true };
  const [, d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return y < 1900 ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    date > new Date()
    ? { date: true }
    : null;
}

@Component({
  selector: 'app-crear-cuenta',
  imports: [ReactiveFormsModule, PermissionDialog],
  templateUrl: './crear-cuenta.html',
  styleUrl: './crear-cuenta.scss',
})
export class CrearCuenta {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(REGISTRATION_GATEWAY);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly legalDocs = inject(DocumentosLegalesService);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly availabilityLoading = signal({ email: false, documentNumber: false });
  readonly availabilityError = signal({ email: '', documentNumber: '' });
  private readonly checks: Partial<Record<'email' | 'documentNumber', Subscription>> = {};
  private readonly checked: Partial<Record<'email' | 'documentNumber', string>> = {};

  readonly documentDisplay = signal('');
  readonly today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  readonly form = this.fb.nonNullable.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.maxLength(60),
        Validators.pattern(/^[\p{L}\p{M} ]+$/u),
        Validators.pattern(/.*\S.*/),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.maxLength(60),
        Validators.pattern(/^[\p{L}\p{M} ]+$/u),
        Validators.pattern(/.*\S.*/),
      ],
    ],
    documentType: ['CC', [Validators.required, Validators.pattern(/^(CC|CE|PA)$/)]],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)]],
    birthDate: ['', [Validators.required, birthDateValidator]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{7,12}$/)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
    terms: [false, Validators.requiredTrue],
    personalData: [false],
    financialData: [false],
  });
  constructor() {
    this.legalDocs.load();
    for (const field of ['email', 'documentNumber'] as const) {
      this.form.controls[field].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        this.checks[field]?.unsubscribe();
        delete this.checked[field];
        this.availabilityLoading.update((state) => ({ ...state, [field]: false }));
        this.availabilityError.update((state) => ({ ...state, [field]: '' }));
      });
    }
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.error.set(''));
    this.form.controls.documentType.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const control = this.form.controls.documentNumber;
      control.setValidators([
        Validators.required,
        Validators.pattern(type === 'CC' ? /^[0-9]{4,10}$/ : /^[A-Za-z0-9]{4,16}$/),
      ]);
      // No reinterpretar un documento de otro tipo: debe ingresarse nuevamente.
      control.reset('');
      this.documentDisplay.set('');
    });
  }
  checkAvailability(field: 'email' | 'documentNumber') {
    const control = this.form.controls[field];
    control.markAsTouched();
    if (this.busy() || (control.invalid && !control.hasError('duplicate'))) return;
    const value = field === 'email' ? control.value.trim().toLowerCase() : control.value;
    const key = field === 'email' ? value : `${this.form.controls.documentType.value}:${value}`;
    if (this.checked[field] === key || this.availabilityLoading()[field]) return;
    this.availabilityLoading.update((state) => ({ ...state, [field]: true }));
    this.availabilityError.update((state) => ({ ...state, [field]: '' }));
    const query =
      field === 'email'
        ? { correo: value }
        : { tipoDocumento: this.form.controls.documentType.value, numeroDocumento: value };
    this.checks[field] = this.gateway
      .checkAvailability(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.availabilityLoading.update((state) => ({ ...state, [field]: false }))),
      )
      .subscribe({
        next: (result) => {
          const available =
            field === 'email' ? result.correoDisponible : result.documentoDisponible;
          if (typeof available !== 'boolean') {
            this.availabilityError.update((state) => ({
              ...state,
              [field]: 'No pudimos comprobar este dato. Vuelve a salir del campo para reintentar.',
            }));
            return;
          }
          this.checked[field] = key;
          if (!available) control.setErrors({ ...control.errors, duplicate: true });
        },
        error: () =>
          this.availabilityError.update((state) => ({
            ...state,
            [field]: 'No pudimos comprobar este dato. Vuelve a salir del campo para reintentar.',
          })),
      });
  }

  onDocumentInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const isCedula = this.form.controls.documentType.value === 'CC';
    const caret = input.selectionStart ?? input.value.length;
    const allowed = isCedula ? /[^0-9]/g : /[^A-Za-z0-9]/g;
    const charactersBeforeCaret = input.value.slice(0, caret).replace(allowed, '').length;
    const raw = input.value.replace(allowed, '').slice(0, isCedula ? 10 : 16);
    const display = isCedula ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : raw;
    this.form.controls.documentNumber.setValue(raw);
    this.documentDisplay.set(display);
    input.value = display;
    let nextCaret = 0;
    let count = 0;
    while (nextCaret < display.length && count < charactersBeforeCaret) {
      if (display[nextCaret] !== '.') count++;
      nextCaret++;
    }
    input.setSelectionRange(nextCaret, nextCaret);
  }
  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const caret = input.selectionStart ?? input.value.length;
    const nextCaret = input.value.slice(0, caret).replace(/[^0-9]/g, '').length;
    const raw = input.value.replace(/[^0-9]/g, '').slice(0, 12);
    input.value = raw;
    this.form.controls.phone.setValue(raw);
    input.setSelectionRange(Math.min(nextCaret, raw.length), Math.min(nextCaret, raw.length));
  }
  openCalendar(input: HTMLInputElement) {
    const [day, month, year] = this.form.controls.birthDate.value.split('/');
    input.value = this.form.controls.birthDate.valid && year ? `${year}-${month}-${day}` : '';
    if (typeof input.showPicker === 'function') input.showPicker();
    else {
      input.classList.add('calendar-fallback');
      input.focus();
    }
  }
  selectBirthDate(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const [year, month, day] = value.split('-');
    this.form.controls.birthDate.setValue(value ? `${day}/${month}/${year}` : '');
    this.form.controls.birthDate.markAsTouched();
  }
  invalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
  accept(kind: PermissionKind) {
    this.form.controls[
      kind === 'personal' ? 'personalData' : kind === 'financial' ? 'financialData' : 'terms'
    ].setValue(true);
  }
  submit() {
    if (this.busy()) return;
    if (!this.legalDocs.ready()) {
      this.error.set('Espera a que se carguen los documentos legales o vuelve a intentarlo.');
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados en rojo. Nada de lo que escribiste se perdió.');
      return;
    }
    const v = this.form.getRawValue();
    const [day, month, year] = v.birthDate.split('/');
    this.busy.set(true);
    this.error.set('');
    this.gateway
      .register({
        identity: {
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          documentType: v.documentType,
          documentNumber: v.documentNumber,
          birthDate: `${year}-${month}-${day}`,
        },
        email: v.email.trim().toLowerCase(),
        phone: v.phone,
        password: v.password,
        consents: {
          terms: v.terms,
          personalData: v.personalData,
          financialData: v.financialData,
          version: this.legalDocs.document('terminos')!.version,
          personalVersion: this.legalDocs.document('open-data')!.version,
          financialVersion: this.legalDocs.document('open-finance')!.version,
        },
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (account) => {
          this.session.account.set(account);
          this.form.controls.password.reset();
          void this.router.navigateByUrl('/confirmar-correo');
        },
        error: (error: unknown) => {
          const code = error instanceof RegistrationError ? error.code : 'UNAVAILABLE';
          const field = code === 'DOCUMENT_EXISTS' ? 'documentNumber' : 'email';
          if (['EMAIL_EXISTS', 'DOCUMENT_EXISTS', 'DISPOSABLE_EMAIL'].includes(code))
            this.form.controls[field].setErrors({ server: true });
          this.error.set(
            code === 'EMAIL_EXISTS'
              ? 'Ya tienes una cuenta con este correo.'
              : code === 'DOCUMENT_EXISTS'
                ? 'Ya existe una cuenta con este número de documento.'
                : code === 'DISPOSABLE_EMAIL'
                  ? 'Necesitas un correo permanente para recuperar tu cotización y confirmar tu cuenta.'
                  : code === 'VALIDATION'
                    ? 'El BFF rechazó los datos. Revisa el formulario e intenta nuevamente.'
                    : 'No pudimos crear tu cuenta. Intenta nuevamente.',
          );
        },
      });
  }
}
