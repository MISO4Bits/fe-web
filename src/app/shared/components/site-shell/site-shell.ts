import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { PermissionDialog } from '../permission-dialog/permission-dialog';
@Component({
  selector: 'app-site-shell',
  imports: [RouterLink, RouterOutlet, PermissionDialog],
  templateUrl: './site-shell.html',
  styleUrl: './site-shell.scss',
})
export class SiteShell {
  readonly session = inject(SessionService);
  readonly router = inject(Router);
  readonly menuOpen = signal(false);
  largeText = false;
}
