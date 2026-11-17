import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { PagerComponent } from '../../shared/pager.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { Apartment, ApartmentsApi } from '../apartments/apartments.api';
import { METHODS, Method, Payment, PaymentsApi } from './payments.api';

const today = () => new Date().toLocaleDateString('sv-SE');

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, PagerComponent, MoneyPipe, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <div><h1>Pagos</h1><p>Cada pago genera un recibo. Los pagos no se borran: se anulan con motivo y quedan en el estado de cuenta.</p></div>
      @if (auth.hasRole('ADMIN','TREASURER')) { <button class="btn btn-primary" (click)="openRegister()">Registrar pago</button> }
    </div>

    <div class="toolbar">
      <div class="field"><label for="s">Estado</label>
        <select id="s" (change)="status = $any($event.target).value; load(0)">
          <option value="">Todos</option><option value="ACTIVE">Vigentes</option><option value="CANCELLED">Anulados</option></select></div>
      <div class="field"><label for="f">Desde</label><input id="f" type="date" (change)="from = $any($event.target).value; load(0)"></div>
      <div class="field"><label for="t">Hasta</label><input id="t" type="date" (change)="to = $any($event.target).value; load(0)"></div>
    </div>

    <div class="card">
      @if (loading()) { <div style="padding:20px"><div class="skeleton"></div></div> }
      @else if (!items().length) { <div class="empty"><strong>No hay pagos para este filtro</strong>Registra el primer pago desde el botón de arriba.</div> }
      @else {
        <div class="table-wrap"><table>
          <thead><tr><th>Recibo</th><th>Fecha</th><th>Apartamento</th><th>Método</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr [class.voided]="p.status === 'CANCELLED'">
                <td class="nowrap"><strong>{{ p.receipt }}</strong></td><td class="nowrap">{{ p.paymentDate }}</td>
                <td><strong>{{ p.apartmentCode }}</strong><div class="muted">{{ p.ownerName }}</div></td>
                <td>{{ methods[p.method] }}<div class="muted">{{ p.reference }}</div></td>
                <td class="num"><span class="strike">{{ p.amount | money }}</span></td>
                <td><app-badge [status]="p.status === 'ACTIVE' ? 'ACTIVE' : 'CANCELLED'" />
                  @if (p.status === 'CANCELLED') { <div class="muted" style="font-size:.8rem">{{ p.cancelReason }}</div> }</td>
                <td class="row-actions">
                  <button class="btn-text" (click)="detail.set(p)">Detalle</button>
                  @if (auth.hasRole('ADMIN') && p.status === 'ACTIVE') { <button class="btn-text danger" (click)="openCancel(p)">Anular</button> }
                </td>
              </tr>
            }
          </tbody></table></div>
        <app-pager [page]="page()" [totalPages]="totalPages()" (go)="load($event)" />
      }
    </div>

    @if (regOpen()) {
      <app-modal title="Registrar pago" (closed)="regOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="register()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <div class="form-grid">
            <div class="field full"><label for="a">Apartamento con deuda</label>
              <select id="a" formControlName="apartmentId" (change)="onApartment()" [class.invalid]="bad('apartmentId')">
                <option value="" disabled>Selecciona un apartamento</option>
                @for (a of apartments(); track a.id) { <option [value]="a.id">{{ a.code }} · {{ a.ownerName }} · {{ a.balance | money }}</option> }
              </select>
              @if (!apartments().length) { <span class="hint">No hay apartamentos con saldo pendiente.</span> }
              @if (selected(); as a) { <span class="hint">Saldo adeudado: <strong>{{ a.balance | money }}</strong> · se aplica a las cuotas más antiguas primero</span> }</div>
            <div class="field"><label for="m">Monto (RD$)</label>
              <input id="m" type="number" step="0.01" inputmode="decimal" formControlName="amount" [class.invalid]="bad('amount')">
              @if (form.controls.amount.errors?.['max']) { <span class="err">Excede el saldo adeudado</span> }
              @else if (bad('amount')) { <span class="err">Indica un monto mayor que cero</span> }</div>
            <div class="field"><label for="d">Fecha del pago</label>
              <input id="d" type="date" [max]="maxDate" formControlName="paymentDate" [class.invalid]="bad('paymentDate')"></div>
            <div class="field"><label for="me">Método</label>
              <select id="me" formControlName="method">@for (m of methodKeys; track m) { <option [value]="m">{{ methods[m] }}</option> }</select></div>
            <div class="field"><label for="r">Referencia</label><input id="r" formControlName="reference" placeholder="N.º de transferencia o cheque"></div>
            <div class="field full"><label for="n">Notas (opcional)</label><input id="n" formControlName="notes"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="regOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Registrando…' : 'Registrar pago' }}</button>
          </div>
        </form>
      </app-modal>
    }

    @if (cancelTarget(); as p) {
      <app-modal [title]="'Anular ' + p.receipt" (closed)="cancelTarget.set(null)">
        <form [formGroup]="cancelForm" (ngSubmit)="confirmCancel()" novalidate>
          @if (formError()) { <div class="form-error" role="alert">{{ formError() }}</div> }
          <p style="margin-top:0">Se revertirán <strong>{{ p.amount | money }}</strong> sobre las cuotas de {{ p.apartmentCode }} y el saldo volverá a subir. Esta acción no se puede deshacer.</p>
          <div class="field"><label for="rs">Motivo de la anulación</label>
            <textarea id="rs" rows="3" formControlName="reason" [class.invalid]="cancelForm.touched && cancelForm.invalid"></textarea>
            @if (cancelForm.touched && cancelForm.invalid) { <span class="err">Explica el motivo (mínimo 5 caracteres)</span> }</div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="cancelTarget.set(null)">Volver</button>
            <button class="btn btn-danger" [disabled]="saving()">{{ saving() ? 'Anulando…' : 'Anular pago' }}</button>
          </div>
        </form>
      </app-modal>
    }

    @if (detail(); as p) {
      <app-modal [title]="p.receipt" (closed)="detail.set(null)">
        <p style="margin-top:0">{{ p.apartmentCode }} · {{ p.ownerName }}<br><span class="muted">{{ p.paymentDate }} · {{ methods[p.method] }} {{ p.reference }}</span></p>
        <table><thead><tr><th>Cuota</th><th class="num">Monto aplicado</th></tr></thead>
          <tbody>@for (al of p.allocations; track al.feeId) { <tr><td>{{ al.concept }} {{ al.period }}</td><td class="num">{{ al.amount | money }}</td></tr> }</tbody></table>
        @if (p.status === 'CANCELLED') {
          <div class="form-error" style="margin-top:14px">Anulado por {{ p.cancelledBy }} el {{ p.cancelledAt?.slice(0, 10) }}. Motivo: {{ p.cancelReason }}</div>
        }
      </app-modal>
    }`,
})
export class PaymentsComponent implements OnInit {
  @Input() newFor?: string;           // ?newFor=<apartmentId> abre el formulario preseleccionado
  auth = inject(AuthService);
  private api = inject(PaymentsApi);
  private apartmentsApi = inject(ApartmentsApi);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  methods = METHODS; methodKeys = Object.keys(METHODS) as Method[]; maxDate = today();
  items = signal<Payment[]>([]); apartments = signal<Apartment[]>([]); selected = signal<Apartment | null>(null);
  page = signal(0); totalPages = signal(0); loading = signal(true);
  regOpen = signal(false); saving = signal(false); formError = signal('');
  cancelTarget = signal<Payment | null>(null); detail = signal<Payment | null>(null);
  status = ''; from = ''; to = '';

  form = this.fb.nonNullable.group({
    apartmentId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01), (c: AbstractControl): ValidationErrors | null => {
      const max = this.selected()?.balance; return max != null && Number(c.value) > max ? { max: true } : null; }]],
    paymentDate: [today(), Validators.required],
    method: ['CASH' as Method, Validators.required], reference: [''], notes: [''],
  });
  cancelForm = this.fb.nonNullable.group({ reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]] });

  ngOnInit() { this.load(0); if (this.newFor && this.auth.hasRole('ADMIN', 'TREASURER')) this.openRegister(this.newFor); }
  bad(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }

  load(page: number) {
    this.loading.set(true);
    this.api.list({ status: this.status, from: this.from, to: this.to }, page).subscribe({
      next: r => { this.items.set(r.content); this.page.set(r.page.number); this.totalPages.set(r.page.totalPages); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }

  openRegister(apartmentId = '') {
    this.formError.set(''); this.selected.set(null);
    this.form.reset({ apartmentId: '', amount: null, paymentDate: today(), method: 'CASH', reference: '', notes: '' });
    this.apartmentsApi.list('', true, 0, 100).subscribe(r => {
      this.apartments.set(r.content.filter(a => a.active));
      if (apartmentId) { this.form.patchValue({ apartmentId }); this.onApartment(); }
    });
    this.regOpen.set(true);
  }

  onApartment() {
    const a = this.apartments().find(x => x.id === this.form.controls.apartmentId.value) ?? null;
    this.selected.set(a);
    this.form.patchValue({ amount: a ? Math.min(a.feeAmount, a.balance) : null });   // sugiere la cuota mensual
  }

  register() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.getRawValue();
    this.api.register({ ...v, amount: Number(v.amount) }).subscribe({
      next: p => { this.saving.set(false); this.regOpen.set(false); this.toast.ok(`Pago registrado: ${p.receipt}`); this.load(0); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }

  openCancel(p: Payment) { this.formError.set(''); this.cancelForm.reset({ reason: '' }); this.cancelTarget.set(p); }

  confirmCancel() {
    const p = this.cancelTarget();
    if (!p || this.cancelForm.invalid) { this.cancelForm.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    this.api.cancel(p.id, this.cancelForm.getRawValue().reason).subscribe({
      next: () => { this.saving.set(false); this.cancelTarget.set(null); this.toast.ok(`Pago ${p.receipt} anulado`); this.load(this.page()); },
      error: e => { this.saving.set(false); this.formError.set(errorMessage(e)); },
    });
  }
}
