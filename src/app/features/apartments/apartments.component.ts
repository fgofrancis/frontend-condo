import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { PagerComponent } from '../../shared/pager.component';
import { Owner, OwnersApi } from '../owners/owners.api';
import { Apartment, ApartmentsApi, Summary } from './apartments.api';

@Component({
  selector: 'app-apartments',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ModalComponent, PagerComponent, MoneyPipe],
  template: `
    <div class="page-head">
      <div><h1>Apartamentos</h1><p>Cuota mensual y saldo adeudado de cada unidad.</p></div>
      @if (auth.hasRole('ADMIN')) { <button class="btn btn-primary" (click)="openForm()">Nuevo apartamento</button> }
    </div>

    @if (summary(); as s) {
      <dl class="kpis">
        <div class="kpi"><dt>Apartamentos activos</dt><dd>{{ s.activeApartments }}</dd></div>
        <div class="kpi"><dt>Con deuda</dt><dd>{{ s.withDebt }}</dd></div>
        <div class="kpi"><dt>Deuda total</dt><dd [class.debt]="s.totalBalance > 0">{{ s.totalBalance | money }}</dd></div>
      </dl>
    }

    <div class="toolbar">
      <div class="field"><label for="q">Buscar</label><input id="q" type="search" placeholder="Código o propietario" (input)="search($any($event.target).value)"></div>
      <label class="check"><input type="checkbox" (change)="toggleDebt($any($event.target).checked)"> Solo con deuda</label>
    </div>

    <div class="card">
      @if (loading()) { <div style="padding:20px"><div class="skeleton"></div></div> }
      @else if (!items().length) {
        <div class="empty"><strong>No hay apartamentos que mostrar</strong>Prueba con otra búsqueda o crea un apartamento nuevo.</div>
      } @else {
        <div class="table-wrap"><table>
          <thead><tr><th>Apartamento</th><th>Propietario</th><th class="num">Cuota mensual</th><th class="num">Saldo adeudado</th><th></th></tr></thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td><strong>{{ a.code }}</strong>@if (!a.active) { <span class="badge badge-mute">Inactivo</span> }<div class="muted">{{ a.description }}</div></td>
                <td>{{ a.ownerName }}</td>
                <td class="num">{{ a.feeAmount | money }}</td>
                <td class="num" [class.debt]="a.balance > 0">{{ a.balance | money }}</td>
                <td class="row-actions">
                  <a class="btn-text" [routerLink]="['/statements', a.id]">Estado de cuenta</a>
                  @if (auth.hasRole('ADMIN','TREASURER') && a.balance > 0) { <a class="btn-text" routerLink="/payments" [queryParams]="{ newFor: a.id }">Registrar pago</a> }
                  @if (auth.hasRole('ADMIN')) { <button class="btn-text" (click)="openForm(a)">Editar</button> }
                </td>
              </tr>
            }
          </tbody></table></div>
        <app-pager [page]="page()" [totalPages]="totalPages()" (go)="load($event)" />
      }
    </div>

    @if (formOpen()) {
      <app-modal [title]="editing() ? 'Editar apartamento' : 'Nuevo apartamento'" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <div class="form-grid">
            <div class="field"><label for="c">Código</label>
              <input id="c" formControlName="code" placeholder="A-101" [class.invalid]="bad('code')">
              @if (bad('code')) { <span class="err">Escribe el código</span> }</div>
            <div class="field"><label for="f">Cuota mensual (RD$)</label>
              <input id="f" type="number" step="0.01" min="0" inputmode="decimal" formControlName="feeAmount" [class.invalid]="bad('feeAmount')">
              @if (bad('feeAmount')) { <span class="err">Indica un monto válido</span> }</div>
            <div class="field full"><label for="o">Propietario</label>
              <select id="o" formControlName="ownerId" [class.invalid]="bad('ownerId')">
                <option value="" disabled>Selecciona un propietario</option>
                @for (o of owners(); track o.id) { <option [value]="o.id">{{ o.fullName }} · {{ o.documentId }}</option> }
              </select>
              @if (bad('ownerId')) { <span class="err">Selecciona un propietario</span> }</div>
            <div class="field full"><label for="d">Descripción (opcional)</label><input id="d" formControlName="description" placeholder="Torre A, piso 1"></div>
            @if (editing()) { <p class="hint full muted">Cambiar la cuota solo afecta a las cuotas que se generen desde ahora.</p> }
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar apartamento' }}</button>
          </div>
        </form>
      </app-modal>
    }`,
})
export class ApartmentsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApartmentsApi);
  private ownersApi = inject(OwnersApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  items = signal<Apartment[]>([]); owners = signal<Owner[]>([]); summary = signal<Summary | null>(null);
  page = signal(0); totalPages = signal(0); loading = signal(true);
  formOpen = signal(false); editing = signal<Apartment | null>(null); saving = signal(false); formError = signal('');
  private q = ''; private debtOnly = false; private timer?: ReturnType<typeof setTimeout>;
  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: [''],
    ownerId: ['', Validators.required],
    feeAmount: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() { this.load(0); this.loadSummary(); }
  bad(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }
  search(v: string) { clearTimeout(this.timer); this.timer = setTimeout(() => { this.q = v.trim(); this.load(0); }, 300); }
  toggleDebt(v: boolean) { this.debtOnly = v; this.load(0); }
  loadSummary() { this.api.summary().subscribe(s => this.summary.set(s)); }

  load(page: number) {
    this.loading.set(true);
    this.api.list(this.q, this.debtOnly, page).subscribe({
      next: r => { this.items.set(r.content); this.page.set(r.page.number); this.totalPages.set(r.page.totalPages); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }

  openForm(a?: Apartment) {
    this.editing.set(a ?? null); this.formError.set('');
    this.form.reset({ code: a?.code ?? '', description: a?.description ?? '', ownerId: a?.ownerId ?? '', feeAmount: a?.feeAmount ?? null });
    this.ownersApi.list('', 0, 100).subscribe(r => this.owners.set(r.content.filter(o => o.active || o.id === a?.ownerId)));
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.getRawValue(), body = { ...v, feeAmount: Number(v.feeAmount) }, cur = this.editing();
    (cur ? this.api.update(cur.id, body) : this.api.create(body)).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.ok('Apartamento guardado'); this.load(this.page()); this.loadSummary(); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }
}
