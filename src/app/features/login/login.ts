import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginService } from './login.service';
import { RUTAS } from '../../nucleo/rutas';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly login = inject(LoginService);
  private readonly router = inject(Router);
  protected readonly rutas = RUTAS;
  protected readonly esperando = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async ingresar(): Promise<void> {
    if (this.form.invalid || this.esperando()) { this.form.markAllAsTouched(); return; }
    this.error.set(''); this.esperando.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.login.ingresar(email.trim(), password);
      await this.router.navigateByUrl(RUTAS.cuenta);
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.error.set(status === 401 || status === 403
        ? 'Correo o contraseña incorrectos.'
        : status === 429 ? 'Demasiados intentos. Inténtalo más tarde.'
        : 'No pudimos iniciar sesión. Inténtalo nuevamente.');
    } finally { this.esperando.set(false); }
  }
}
