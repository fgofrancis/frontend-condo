import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { PagerComponent } from '../../shared/pager.component';
import { Owner, OwnersApi } from './owners.api';

@Component({
  selector: 'app-owners',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, PagerComponent],
  template: `
    <div class="page-head">
      <div><h1>Propietarios</h1><p>Personas responsables de cada apartamento.</p></div>
      @if (auth.hasRole('ADMIN')) { <button class="btn btn-primary" (click)="openForm()">Nuevo propietario</button> }
    </div>

    <div class="toolbar">
      <div class="field"><label for="q">Buscar</label><input id="q" type="search" placeholder="Nombre o documento" (input)="search($any($event.target).value)"></div>
    </div>

    <div class="card">
      @if (loading()) { <div style="padding:20px"><div class="skeleton"></div></div> }
      @else if (!items().length) {
        <div class="empty"><strong>No hay propietarios que mostrar</strong>
          @if (auth.hasRole('ADMIN')) { Registra el primero para poder crear apartamentos. }</div>
      } @else {
        <div class="table-wrap"><table>
          <thead><tr><th>Nombre</th><th>Documento</th><th>Contacto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (o of items(); track o.id) {
              <tr>
                <td>{{ o.fullName }}</td><td class="nowrap">{{ o.documentId }}</td>
                <td class="muted">{{ o.email }} {{ o.phone }}</td>
                <td><span class="badge" [class.badge-ok]="o.active" [class.badge-mute]="!o.active">{{ o.active ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="row-actions">
                  @if (auth.hasRole('ADMIN')) {
                    <button class="btn-text" (click)="openForm(o)">Editar</button>
                    <button class="btn-text" [class.danger]="o.active" (click)="toggle(o)">{{ o.active ? 'Desactivar' : 'Activar' }}</button>
                  }
                </td>
              </tr>
            }
          </tbody></table></div>
        <app-pager [page]="page()" [totalPages]="totalPages()" (go)="load($event)" />
      }
    </div>

    @if (formOpen()) {
      <app-modal [title]="editing() ? 'Editar propietario' : 'Nuevo propietario'" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <div class="form-grid">
            <div class="field full"><label for="n">Nombre completo</label>
              <input id="n" formControlName="fullName" [class.invalid]="bad('fullName')">
              @if (bad('fullName')) { <span class="err">Escribe el nombre</span> }</div>
            <div class="field"><label for="d">Documento (cédula / RNC)</label>
              <input id="d" formControlName="documentId" [class.invalid]="bad('documentId')">
              @if (bad('documentId')) { <span class="err">Escribe el documento</span> }</div>
            <div class="field"><label for="ph">Teléfono</label><input id="ph" type="tel" formControlName="phone"></div>
            <div class="field full"><label for="em">Correo</label>
              <input id="em" type="email" formControlName="email" [class.invalid]="bad('email')">
              @if (bad('email')) { <span class="err">Correo inválido</span> }</div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar propietario' }}</button>
          </div>
        </form>
      </app-modal>
    }`,
})
export class OwnersComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(OwnersApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  items = signal<Owner[]>([]); page = signal(0); totalPages = signal(0); loading = signal(true);
  formOpen = signal(false); editing = signal<Owner | null>(null); saving = signal(false); formError = signal('');
  private q = ''; private timer?: ReturnType<typeof setTimeout>;
  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    documentId: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', Validators.email], phone: [''],
  });

  ngOnInit() { this.load(0); }
  bad(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }

  search(v: string) { clearTimeout(this.timer); this.timer = setTimeout(() => { this.q = v.trim(); this.load(0); }, 300); }

  load(page: number) {
    this.loading.set(true);
    this.api.list(this.q, page).subscribe({
      next: r => { this.items.set(r.content); this.page.set(r.page.number); this.totalPages.set(r.page.totalPages); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }

  openForm(o?: Owner) {
    this.editing.set(o ?? null); this.formError.set('');
    this.form.reset({ fullName: o?.fullName ?? '', documentId: o?.documentId ?? '', email: o?.email ?? '', phone: o?.phone ?? '' });
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const body = this.form.getRawValue(), cur = this.editing();
    (cur ? this.api.update(cur.id, body) : this.api.create(body)).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.ok('Propietario guardado'); this.load(this.page()); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  toggle(o: Owner) {
    this.api.setActive(o.id, !o.active).subscribe({
      next: () => { this.toast.ok(o.active ? 'Propietario desactivado' : 'Propietario activado'); this.load(this.page()); },
      error: e => this.toast.error(errorMessage(e)),
    });
  }
}
