import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SessionService } from '../../../../core/services/session.service';
import { REGISTRATION_GATEWAY } from '../../services/registro.gateway';
import { RegistrationError } from '../../models/registro.model';
@Component({
  selector: 'app-confirmar-correo',
  imports: [RouterLink],
  templateUrl: './confirmar-correo.html',
  styleUrl: './confirmar-correo.scss',
})
export class ConfirmarCorreo {
  readonly session = inject(SessionService);
  private readonly gateway = inject(REGISTRATION_GATEWAY);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly message = signal('');
  readonly confirmed = signal(false);
  readonly busy = signal(false);
  readonly expired = signal(false);
  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) return;
    this.busy.set(true);
    this.gateway
      .confirmEmail(token)
      .pipe(
        takeUntilDestroyed(),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmed.set(true);
          const account = this.session.account();
          if (account) this.session.account.set({ ...account, emailConfirmed: true });
          this.message.set('Tu correo está confirmado. Puedes iniciar sesión.');
        },
        error: (error: unknown) => {
          this.expired.set(error instanceof RegistrationError && error.code === 'EXPIRED_TOKEN');
          this.message.set(
            this.expired()
              ? 'El enlace expiró. Solicita uno nuevo sin volver a registrarte.'
              : 'No pudimos validar este enlace. Solicita uno nuevo.',
          );
        },
      });
  }
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
