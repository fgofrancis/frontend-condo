import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { PASSWORD_PATTERN, generatePassword } from '../../shared/password';
import { ROLE_LABELS, TenantInfo, TenantUser, TenantsApi, UserRole } from './tenants.api';

@Component({
  selector: 'app-tenant-users',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [title]="'Usuarios · ' + tenant.name" (closed)="closed.emit()">
      @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }

      @if (mode() === 'list') {
        <div class="actions" style="justify-content:space-between;margin-bottom:10px">
          <span class="muted">{{ users().length }} usuarios</span>
          <button class="btn btn-ghost btn-sm" (click)="startAdd()">Agregar usuario</button>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td><strong>{{ u.fullName }}</strong><div class="muted">{{ u.email }}</div></td>
                <td>{{ roles[u.role] }}</td>
                <td>@if (u.locked) { <span class="badge badge-warn">Bloqueado</span> }
                    @else { <span class="badge" [class.badge-ok]="u.enabled" [class.badge-mute]="!u.enabled">{{ u.enabled ? 'Activo' : 'Inactivo' }}</span> }</td>
                <td class="row-actions">
                  <button class="btn-text" (click)="startReset(u)">Contraseña</button>
                  <button class="btn-text" [class.danger]="u.enabled" (click)="toggle(u)">{{ u.enabled ? 'Desactivar' : 'Activar' }}</button>
                </td>
              </tr>
            }
          </tbody></table></div>
        <div class="modal-foot"><button class="btn btn-ghost" (click)="closed.emit()">Cerrar</button></div>
      }

      @if (mode() === 'add') {
        <form [formGroup]="addForm" (ngSubmit)="add()" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="un">Nombre completo</label><input id="un" formControlName="fullName" [class.invalid]="addBad('fullName')"></div>
            <div class="field"><label for="ue">Correo</label><input id="ue" type="email" formControlName="email" [class.invalid]="addBad('email')"></div>
            <div class="field"><label for="ur">Rol</label>
              <select id="ur" formControlName="role">@for (r of roleKeys; track r) { <option [value]="r">{{ roles[r] }}</option> }</select></div>
            <div class="field full"><label for="up">Contraseña inicial</label>
              <div class="actions"><input id="up" [type]="show() ? 'text' : 'password'" formControlName="password" [class.invalid]="addBad('password')" style="flex:1" autocomplete="new-password">
                <button type="button" class="btn btn-ghost btn-sm" (click)="gen(addForm)">Generar</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="show.set(!show())">{{ show() ? 'Ocultar' : 'Ver' }}</button></div>
              @if (addBad('password')) { <span class="err">Mínimo 12 caracteres, con letras y números</span> }</div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="mode.set('list')">Volver</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Crear usuario' }}</button>
          </div>
        </form>
      }

      @if (mode() === 'reset' && target(); as u) {
        <form [formGroup]="resetForm" (ngSubmit)="reset(u)" novalidate>
          <p style="margin-top:0">Nueva contraseña para <strong>{{ u.fullName }}</strong>. Se cerrarán todas sus sesiones abiertas.</p>
          <div class="field"><label for="rp">Contraseña</label>
            <div class="actions"><input id="rp" [type]="show() ? 'text' : 'password'" formControlName="password" style="flex:1" autocomplete="new-password">
              <button type="button" class="btn btn-ghost btn-sm" (click)="gen(resetForm)">Generar</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="show.set(!show())">{{ show() ? 'Ocultar' : 'Ver' }}</button></div>
            @if (resetForm.touched && resetForm.invalid) { <span class="err">Mínimo 12 caracteres, con letras y números</span> }</div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="mode.set('list')">Volver</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
          </div>
        </form>
      }
    </app-modal>`,
})
export class TenantUsersComponent implements OnInit {
  @Input({ required: true }) tenant!: TenantInfo;
  @Output() closed = new EventEmitter<void>();
  private api = inject(TenantsApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  roles = ROLE_LABELS; roleKeys = Object.keys(ROLE_LABELS) as UserRole[];
  users = signal<TenantUser[]>([]); mode = signal<'list' | 'add' | 'reset'>('list');
  target = signal<TenantUser | null>(null); saving = signal(false); formError = signal(''); show = signal(false);
  addForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
    role: ['TREASURER' as UserRole, Validators.required], password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });
  resetForm = this.fb.nonNullable.group({ password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]] });

  ngOnInit() { this.load(); }
  addBad(c: string) { const x = this.addForm.get(c)!; return x.invalid && (x.touched || x.dirty); }
  load() { this.api.users(this.tenant.id).subscribe({ next: u => this.users.set(u), error: e => this.formError.set(errorMessage(e)) }); }
  gen(f: { controls: { password: { setValue(v: string): void } } }) { f.controls.password.setValue(generatePassword()); this.show.set(true); }

  startAdd() { this.formError.set(''); this.addForm.reset({ fullName: '', email: '', role: 'TREASURER', password: '' }); this.show.set(false); this.mode.set('add'); }
  startReset(u: TenantUser) { this.formError.set(''); this.resetForm.reset({ password: '' }); this.target.set(u); this.show.set(false); this.mode.set('reset'); }

  add() {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    this.api.createUser(this.tenant.id, this.addForm.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.toast.ok('Usuario creado'); this.mode.set('list'); this.load(); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  reset(u: TenantUser) {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    this.api.resetPassword(this.tenant.id, u.id, this.resetForm.getRawValue().password).subscribe({
      next: () => { this.saving.set(false); this.toast.ok('Contraseña actualizada'); this.mode.set('list'); this.load(); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  toggle(u: TenantUser) {
    this.api.setUserEnabled(this.tenant.id, u.id, !u.enabled).subscribe({
      next: () => { this.toast.ok(u.enabled ? 'Usuario desactivado' : 'Usuario activado'); this.load(); },
      error: e => this.formError.set(errorMessage(e)),
    });
  }
}
