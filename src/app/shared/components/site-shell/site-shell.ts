import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PermissionDialog } from '../permission-dialog/permission-dialog';
@Component({
  selector: 'app-site-shell',
  imports: [RouterLink, RouterOutlet, PermissionDialog],
  templateUrl: './site-shell.html',
  styleUrl: './site-shell.scss',
})
export class SiteShell {
  largeText = false;
}
