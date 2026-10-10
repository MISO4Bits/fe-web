import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { VERIFICATION_CODE } from '../../../../core/services/verification-code';
import { SessionService } from '../../../../core/services/session.service';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';

@Component({
  selector: 'app-verificar-correo',
  templateUrl: './verificar-correo.html',
  styleUrl: '../confirmar-correo/confirmar-correo.scss',
})
export class VerificarCorreo {
  private code = inject(VERIFICATION_CODE)();
  private readonly gateway = inject(REGISTRATION_GATEWAY);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<'loading' | 'success' | 'invalid' | 'used' | 'error'>('loading');
  readonly busy = signal(false);
  readonly email = signal('');
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.code = null;
    });
    this.verify();
  }
  verify() {
    if (this.busy() || ['success', 'invalid', 'used'].includes(this.state())) return;
    if (!this.code || !/^[A-Za-z0-9_-]{10,512}$/.test(this.code)) {
      this.code = null;
      this.state.set('invalid');
      return;
    }
    this.busy.set(true);
    this.state.set('loading');
    this.gateway
      .confirmEmail(this.code)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.code = null;
          this.email.set(result.email);
          this.state.set('success');
          const account = this.session.account();
          if (account?.email === result.email)
            this.session.account.set({ ...account, emailConfirmed: true });
        },
        error: (error: unknown) => {
          const code = error instanceof RegistrationError ? error.code : 'UNAVAILABLE';
          this.state.set(
            code === 'INVALID_TOKEN' ? 'invalid' : code === 'EXPIRED_TOKEN' ? 'used' : 'error',
          );
          if (this.state() !== 'error') this.code = null;
        },
      });
  }
}
