import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SessionService } from '../../../../core/services/session.service';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';
@Component({
  selector: 'app-confirmar-correo',
  templateUrl: './confirmar-correo.html',
  styleUrl: './confirmar-correo.scss',
})
export class ConfirmarCorreo {
  readonly session = inject(SessionService);
  private readonly gateway = inject(REGISTRATION_GATEWAY);
  private readonly destroyRef = inject(DestroyRef);
  readonly message = signal('');
  readonly busy = signal(false);
  resend() {
    const email = this.session.account()?.email;
    if (!email || this.busy()) return;
    this.busy.set(true);
    this.gateway
      .resendEmail(email)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () =>
          this.message.set(
            'Solicitud recibida. Si corresponde, recibirás un nuevo enlace en tu correo.',
          ),
        error: (error: unknown) =>
          this.message.set(
            error instanceof RegistrationError && error.code === 'SESSION_REQUIRED'
              ? 'Tu sesión terminó. Necesitas una sesión activa para reenviar el correo.'
              : 'No pudimos solicitar el correo. Intenta nuevamente.',
          ),
      });
  }
}
