import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="topbar">
      <button class="icon-btn" aria-label="Abrir menú" (click)="open.set(true)">☰</button>
      <strong>{{ auth.user()?.tenantName }}</strong>
    </div>
    <div class="shell">
      @if (open()) { <div class="scrim" (click)="open.set(false)"></div> }
      <aside class="side" [class.open]="open()">
        <div class="brand">{{ auth.user()?.tenantName }}<small>Administración de condominio</small></div>
        <nav class="nav" (click)="open.set(false)">
          <a routerLink="/apartments" routerLinkActive="active">Apartamentos</a>
          <a routerLink="/owners" routerLinkActive="active">Propietarios</a>
          <a routerLink="/fees" routerLinkActive="active">Cuotas</a>
          <a routerLink="/payments" routerLinkActive="active">Pagos</a>
          <a routerLink="/statements" routerLinkActive="active">Estados de cuenta</a>
        </nav>
        <div class="side-foot">
          <strong>{{ auth.user()?.fullName }}</strong>
          <span>{{ roleLabel() }}</span><br>
          <button class="btn-link" (click)="auth.logout()">Cerrar sesión</button>
        </div>
      </aside>
      <main class="main"><router-outlet /></main>
    </div>`,
})
export class ShellComponent {
  auth = inject(AuthService);
  open = signal(false);
  //roleLabel = () => ({ ADMIN: 'Administrador', TREASURER: 'Tesorería', VIEWER: 'Solo lectura' } as const)[this.auth.user()?.role ?? 'VIEWER'];
  roleLabel = () => ({ ADMIN: 'Administrador', TREASURER: 'Tesorería', VIEWER: 'Solo lectura', PLATFORM_ADMIN: 'Operador de plataforma' } as const)[this.auth.user()?.role ?? 'VIEWER'];
}
