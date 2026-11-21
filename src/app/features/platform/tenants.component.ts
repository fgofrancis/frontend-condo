import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { PagerComponent } from '../../shared/pager.component';
import { CODE_PATTERN, PASSWORD_PATTERN, generatePassword, slugify } from '../../shared/password';
import { TenantUsersComponent } from './tenant-users.component';
import { TenantInfo, TenantsApi } from './tenants.api';

interface Credentials { name: string; code: string; email: string; password: string; }

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, PagerComponent, MoneyPipe, TenantUsersComponent],
  template: `
    <div class="page-head">
      <div><h1>Condominios</h1><p>Crea y administra los condominios de la plataforma. Cada uno tiene sus datos totalmente aislados.</p></div>
      <button class="btn btn-primary" (click)="openForm()">Nuevo condominio</button>
    </div>

    <div class="toolbar">
      <div class="field"><label for="q">Buscar</label><input id="q" type="search" placeholder="Nombre o código" (input)="search($any($event.target).value)"></div>
    </div>

    <div class="card">
      @if (loading()) { <div style="padding:20px"><div class="skeleton"></div></div> }
      @else if (!items().length) {
        <div class="empty"><strong>Aún no hay condominios</strong>Crea el primero: se generará también su administrador inicial.</div>
      } @else {
        <div class="table-wrap"><table>
          <thead><tr><th>Condominio</th><th>Contacto</th><th class="num">Apartamentos</th><th class="num">Usuarios</th><th class="num">Deuda total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (t of items(); track t.id) {
              <tr [class.voided]="!t.active">
                <td><strong>{{ t.name }}</strong><div class="muted">Código: {{ t.code }}</div></td>
                <td class="muted">{{ t.contactEmail }} {{ t.phone }}</td>
                <td class="num">{{ t.apartments }}</td><td class="num">{{ t.users }}</td>
                <td class="num" [class.debt]="t.totalBalance > 0">{{ t.totalBalance | money }}</td>
                <td><span class="badge" [class.badge-ok]="t.active" [class.badge-warn]="!t.active">{{ t.active ? 'Activo' : 'Suspendido' }}</span></td>
                <td class="row-actions">
                  <button class="btn-text" (click)="usersOf.set(t)">Usuarios</button>
                  <button class="btn-text" (click)="openForm(t)">Editar</button>
                  <button class="btn-text" [class.danger]="t.active" (click)="toggle(t)">{{ t.active ? 'Suspender' : 'Reactivar' }}</button>
                </td>
              </tr>
            }
          </tbody></table></div>
        <app-pager [page]="page()" [totalPages]="totalPages()" (go)="load($event)" />
      }
    </div>

    @if (formOpen()) {
      <app-modal [title]="editing() ? 'Editar condominio' : 'Nuevo condominio'" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <div class="form-grid">
            <div class="field full"><label for="n">Nombre del condominio</label>
              <input id="n" formControlName="name" (input)="suggestCode()" [class.invalid]="bad('name')">
              @if (bad('name')) { <span class="err">Escribe el nombre</span> }</div>
            @if (!editing()) {
              <div class="field full"><label for="c">Código de acceso</label>
                <input id="c" formControlName="code" autocapitalize="none" (input)="codeTouched = true" [class.invalid]="bad('code')">
                @if (bad('code')) { <span class="err">3 a 40 caracteres: minúsculas, números y guiones</span> }
                @else { <span class="hint">Es lo que escribirán los usuarios al iniciar sesión. No se puede cambiar después.</span> }</div>
            }
            <div class="field"><label for="ce">Correo de contacto</label><input id="ce" type="email" formControlName="contactEmail" [class.invalid]="bad('contactEmail')"></div>
            <div class="field"><label for="ph">Teléfono</label><input id="ph" type="tel" formControlName="phone"></div>
            <div class="field full"><label for="ad">Dirección</label><input id="ad" formControlName="address"></div>
          </div>

          @if (!editing()) {
            <h2 style="margin:20px 0 10px">Administrador inicial</h2>
            <div class="form-grid" formGroupName="admin">
              <div class="field"><label for="an">Nombre completo</label><input id="an" formControlName="fullName" [class.invalid]="bad('admin.fullName')"></div>
              <div class="field"><label for="ae">Correo (usuario)</label><input id="ae" type="email" formControlName="email" [class.invalid]="bad('admin.email')"></div>
              <div class="field full"><label for="ap">Contraseña inicial</label>
                <div class="actions"><input id="ap" [type]="show() ? 'text' : 'password'" formControlName="password" style="flex:1" autocomplete="new-password" [class.invalid]="bad('admin.password')">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="genPassword()">Generar</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="show.set(!show())">{{ show() ? 'Ocultar' : 'Ver' }}</button></div>
                @if (bad('admin.password')) { <span class="err">Mínimo 12 caracteres, con letras y números</span> }</div>
            </div>
          }
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : editing() ? 'Guardar cambios' : 'Crear condominio' }}</button>
          </div>
        </form>
      </app-modal>
    }

    @if (created(); as c) {
      <app-modal title="Condominio creado" (closed)="created.set(null)">
        <p style="margin-top:0"><strong>{{ c.name }}</strong> ya está listo. Entrega estas credenciales al administrador; la contraseña no se volverá a mostrar.</p>
        <dl class="st-head" style="border:0;padding:0;margin:0 0 8px"><dl>
          <dt>Código</dt><dd><strong>{{ c.code }}</strong></dd>
          <dt>Usuario</dt><dd><strong>{{ c.email }}</strong></dd>
          <dt>Contraseña</dt><dd><strong>{{ c.password }}</strong></dd></dl></dl>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="copy(c)">Copiar credenciales</button>
          <button class="btn btn-primary" (click)="created.set(null)">Listo</button>
        </div>
      </app-modal>
    }

    @if (usersOf(); as t) { <app-tenant-users [tenant]="t" (closed)="usersOf.set(null); load(page())" /> }`,
})
export class TenantsComponent implements OnInit {
  private api = inject(TenantsApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  items = signal<TenantInfo[]>([]); page = signal(0); totalPages = signal(0); loading = signal(true);
  formOpen = signal(false); editing = signal<TenantInfo | null>(null); saving = signal(false); formError = signal('');
  created = signal<Credentials | null>(null); usersOf = signal<TenantInfo | null>(null); show = signal(false);
  codeTouched = false;
  private q = ''; private timer?: ReturnType<typeof setTimeout>;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', [Validators.required, Validators.pattern(CODE_PATTERN)]],
    contactEmail: ['', Validators.email], phone: [''], address: [''],
    admin: this.fb.nonNullable.group({
      fullName: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    }),
  });

  ngOnInit() { this.load(0); }
  bad(path: string) { const x = this.form.get(path)!; return x.invalid && (x.touched || x.dirty); }
  search(v: string) { clearTimeout(this.timer); this.timer = setTimeout(() => { this.q = v.trim(); this.load(0); }, 300); }

  load(page: number) {
    this.loading.set(true);
    this.api.list(this.q, page).subscribe({
      next: r => { this.items.set(r.content); this.page.set(r.page.number); this.totalPages.set(r.page.totalPages); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }

  openForm(t?: TenantInfo) {
    this.editing.set(t ?? null); this.formError.set(''); this.codeTouched = false; this.show.set(false);
    const f = this.form;
    f.reset({ name: t?.name ?? '', code: t?.code ?? '', contactEmail: t?.contactEmail ?? '', phone: t?.phone ?? '', address: t?.address ?? '',
              admin: { fullName: '', email: '', password: '' } });
    // al editar no se piden código ni administrador
    const toggle = (path: string, on: boolean) => on ? f.get(path)!.enable() : f.get(path)!.disable();
    toggle('code', !t); toggle('admin', !t);
    this.formOpen.set(true);
  }

  suggestCode() { if (!this.editing() && !this.codeTouched) this.form.controls.code.setValue(slugify(this.form.controls.name.value)); }
  genPassword() { this.form.controls.admin.controls.password.setValue(generatePassword()); this.show.set(true); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.getRawValue(), cur = this.editing();
    if (cur) {
      this.api.update(cur.id, { name: v.name, address: v.address, contactEmail: v.contactEmail, phone: v.phone }).subscribe({
        next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.ok('Condominio actualizado'); this.load(this.page()); },
        error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
      });
      return;
    }
    this.api.create(v).subscribe({
      next: t => {
        this.saving.set(false); this.formOpen.set(false);
        this.created.set({ name: t.name, code: t.code, email: v.admin.email, password: v.admin.password });
        this.load(0);
      },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  toggle(t: TenantInfo) {
    const msg = t.active
      ? `¿Suspender «${t.name}»? Sus usuarios no podrán entrar y se cerrarán sus sesiones. Los datos se conservan.`
      : `¿Reactivar «${t.name}»?`;
    if (!confirm(msg)) return;
    this.api.setActive(t.id, !t.active).subscribe({
      next: () => { this.toast.ok(t.active ? 'Condominio suspendido' : 'Condominio reactivado'); this.load(this.page()); },
      error: e => this.toast.error(errorMessage(e)),
    });
  }

  copy(c: Credentials) {
    navigator.clipboard?.writeText(`Condominio: ${c.name}\nCódigo: ${c.code}\nUsuario: ${c.email}\nContraseña: ${c.password}`)
      .then(() => this.toast.ok('Credenciales copiadas'), () => this.toast.error('No se pudo copiar'));
  }
}
