import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login">
      <section class="login-art">
        <strong>Condominio</strong>
        <div>
          <h1>Cuotas al día, cuentas claras.</h1>
          <p>Registra pagos, controla saldos y entrega estados de cuenta sin hojas de cálculo.</p>
        </div>
        <span></span>
      </section>
      <section class="login-form">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h2>{{ platform() ? 'Acceso de plataforma' : 'Iniciar sesión' }}</h2>
          @if (expired) { <div class="form-error">Tu sesión expiró. Inicia sesión de nuevo.</div> }
          @if (error()) { <div class="form-error" role="alert">{{ error() }}</div> }
          @if (!platform()) {
            <div class="field"><label for="t">Código del condominio</label>
              <input id="t" formControlName="tenantCode" autocomplete="organization" autocapitalize="none"></div>
          }
          <div class="field"><label for="e">Correo</label>
            <input id="e" type="email" formControlName="email" autocomplete="username"></div>
          <div class="field"><label for="p">Contraseña</label>
            <input id="p" type="password" formControlName="password" autocomplete="current-password"></div>
          <button class="btn btn-primary" [disabled]="loading()">{{ loading() ? 'Entrando…' : 'Entrar' }}</button>
          <button type="button" class="btn-text" (click)="toggleMode()">
            {{ platform() ? '← Entrar a un condominio' : 'Soy operador de la plataforma' }}</button>
        </form>
      </section>
    </div>`,
})
export class LoginComponent {
  @Input() expired?: string;
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');
  platform = signal(false);
  form = this.fb.nonNullable.group({
    tenantCode: [localStorage.getItem('condo.tenant') ?? ''],   // dato no sensible
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  toggleMode() {
    this.platform.update(v => !v); this.error.set('');
    const c = this.form.controls.tenantCode;
    this.platform() ? c.clearValidators() : c.addValidators(Validators.required);
    c.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Completa todos los campos'); return; }
    this.loading.set(true); this.error.set('');
    const { tenantCode, email, password } = this.form.getRawValue();
    const request$ = this.platform() ? this.auth.platformLogin(email, password) : this.auth.login(tenantCode, email, password);
    request$.subscribe({
      next: () => { if (!this.platform()) localStorage.setItem('condo.tenant', tenantCode); this.router.navigateByUrl('/'); },
      error: e => { this.loading.set(false); this.error.set(e.status === 401 ? 'Credenciales inválidas o cuenta bloqueada temporalmente' : 'No se pudo iniciar sesión. Intenta de nuevo.'); },
    });
  }
}