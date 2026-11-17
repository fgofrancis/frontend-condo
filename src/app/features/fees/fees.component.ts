import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { PagerComponent } from '../../shared/pager.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { Fee, FeesApi } from './fees.api';

const thisMonth = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, PagerComponent, MoneyPipe, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <div><h1>Cuotas</h1><p>Cargos mensuales por apartamento. Los pagos se aplican primero a la cuota más antigua.</p></div>
      @if (auth.hasRole('ADMIN','TREASURER')) { <button class="btn btn-primary" (click)="openGenerate()">Generar cuotas del mes</button> }
    </div>

    <div class="toolbar">
      <div class="field"><label for="p">Periodo</label><input id="p" type="month" [value]="period" (change)="period = $any($event.target).value; load(0)"></div>
      <div class="field"><label for="s">Estado</label>
        <select id="s" (change)="status = $any($event.target).value; load(0)">
          <option value="">Todos</option><option value="PENDING">Pendiente</option><option value="PARTIAL">Abonada</option>
          <option value="PAID">Pagada</option><option value="CANCELLED">Anulada</option></select></div>
      <label class="check"><input type="checkbox" (change)="overdueOnly = $any($event.target).checked; load(0)"> Solo vencidas</label>
    </div>

    <div class="card">
      @if (loading()) { <div style="padding:20px"><div class="skeleton"></div></div> }
      @else if (!items().length) {
        <div class="empty"><strong>No hay cuotas para este filtro</strong>
          @if (auth.hasRole('ADMIN','TREASURER')) { Usa «Generar cuotas del mes» para crear los cargos de todos los apartamentos. }</div>
      } @else {
        <div class="table-wrap"><table>
          <thead><tr><th>Periodo</th><th>Apartamento</th><th>Concepto</th><th>Vence</th><th class="num">Monto</th><th class="num">Pagado</th><th class="num">Pendiente</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (f of items(); track f.id) {
              <tr [class.voided]="f.status === 'CANCELLED'">
                <td class="nowrap">{{ f.period }}</td>
                <td><strong>{{ f.apartmentCode }}</strong><div class="muted">{{ f.ownerName }}</div></td>
                <td>{{ f.concept }}</td><td class="nowrap">{{ f.dueDate }}</td>
                <td class="num">{{ f.amount | money }}</td><td class="num">{{ f.paidAmount | money }}</td>
                <td class="num" [class.debt]="f.overdue">{{ f.remaining | money }}</td>
                <td>@if (f.overdue) { <app-badge status="OVERDUE" /> } @else { <app-badge [status]="f.status" /> }</td>
                <td class="row-actions">@if (auth.hasRole('ADMIN') && f.status === 'PENDING') { <button class="btn-text danger" (click)="cancel(f)">Anular</button> }</td>
              </tr>
            }
          </tbody></table></div>
        <app-pager [page]="page()" [totalPages]="totalPages()" (go)="load($event)" />
      }
    </div>

    @if (genOpen()) {
      <app-modal title="Generar cuotas del mes" (closed)="genOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="generate()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <p class="muted" style="margin-top:0">Se crea una cuota por cada apartamento activo usando su cuota mensual. Si ya existe, se omite.</p>
          <div class="form-grid">
            <div class="field"><label for="gp">Periodo</label><input id="gp" type="month" formControlName="period"></div>
            <div class="field"><label for="gd">Fecha de vencimiento</label><input id="gd" type="date" formControlName="dueDate"></div>
            <div class="field full"><label for="gc">Concepto</label><input id="gc" formControlName="concept"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="genOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Generando…' : 'Generar cuotas' }}</button>
          </div>
        </form>
      </app-modal>
    }`,
})
export class FeesComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(FeesApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  items = signal<Fee[]>([]); page = signal(0); totalPages = signal(0); loading = signal(true);
  genOpen = signal(false); saving = signal(false); formError = signal('');
  period = thisMonth(); status = ''; overdueOnly = false;
  form = this.fb.nonNullable.group({
    period: [thisMonth(), Validators.required], dueDate: ['', Validators.required], concept: ['Cuota de mantenimiento', Validators.required],
  });

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading.set(true);
    this.api.list({ period: this.period, status: this.status, overdueOnly: this.overdueOnly }, page).subscribe({
      next: r => { this.items.set(r.content); this.page.set(r.page.number); this.totalPages.set(r.page.totalPages); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }

  openGenerate() { this.formError.set(''); this.genOpen.set(true); }

  generate() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.formError.set('Completa periodo y fecha de vencimiento'); return; }
    this.saving.set(true); this.formError.set('');
    this.api.generate(this.form.getRawValue()).subscribe({
      next: r => {
        this.saving.set(false); this.genOpen.set(false);
        this.toast.ok(`${r.created} cuotas generadas${r.skipped ? `, ${r.skipped} ya existían` : ''}`);
        this.period = this.form.getRawValue().period; this.load(0);
      },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  cancel(f: Fee) {
    if (!confirm(`¿Anular la cuota ${f.period} de ${f.apartmentCode}? Dejará de sumar al saldo.`)) return;
    this.api.cancel(f.id).subscribe({
      next: () => { this.toast.ok('Cuota anulada'); this.load(this.page()); },
      error: e => this.toast.error(errorMessage(e)),
    });
  }
}
