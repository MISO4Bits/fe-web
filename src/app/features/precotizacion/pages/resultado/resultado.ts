import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/services/session.service';
@Component({
  selector: 'app-resultado',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './resultado.html',
  styleUrl: './resultado.scss',
})
export class Resultado {
  readonly session = inject(SessionService);
  // Fixture del prototipo: no representa un cálculo real del BFF.
  readonly monthlyPrice = 57100;
}
