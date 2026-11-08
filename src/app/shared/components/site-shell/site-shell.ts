import { Component } from '@angular/core';
import { BACKOFFICE_LOGIN_URL } from '../../../core/config/backoffice-url';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PermissionDialog } from '../permission-dialog/permission-dialog';
@Component({
  selector: 'app-site-shell',
  imports: [RouterLink, RouterOutlet, PermissionDialog],
  templateUrl: './site-shell.html',
  styleUrl: './site-shell.scss',
})
export class SiteShell {
  protected readonly backofficeUrl = BACKOFFICE_LOGIN_URL;
  largeText = false;
}
