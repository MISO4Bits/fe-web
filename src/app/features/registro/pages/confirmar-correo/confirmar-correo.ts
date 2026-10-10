import { Component, inject } from '@angular/core';
import { SessionService } from '../../../../core/services/session.service';
@Component({
  selector: 'app-confirmar-correo',
  templateUrl: './confirmar-correo.html',
  styleUrl: './confirmar-correo.scss',
})
export class ConfirmarCorreo {
  readonly session = inject(SessionService);
}
