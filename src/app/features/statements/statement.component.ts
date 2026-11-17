import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { Apartment, ApartmentsApi } from '../apartments/apartments.api';
import { Statement, StatementsApi } from './statements.api';

@Component({
  selector: 'app-statement',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="page-head no-print">
      <div><h1>Estado de cuenta</h1><p>Cuotas, pagos y anulaciones con saldo corrido.</p></div>
      @if (data()) { <button class="btn btn-ghost" (click)="print()">Imprimir o guardar PDF</button> }
    </div>

    <div class="toolbar no-print">
      <div class="field" style="min-width:240px"><label for="a">Apartamento</label>
        <select id="a" (change)="pick($any($event.target).value)">
          <option value="" [selected]="!id">Selecciona un apartamento</option>
          @for (a of apartments(); track a.id) { <option [value]="a.id" [selected]="a.id === id">{{ a.code }} · {{ a.ownerName }}</option> }
        </select></div>
      <div class="field"><label for="f">Desde</label><input id="f" type="date" (change)="from = $any($event.target).value; load()"></div>
      <div class="field"><label for="t">Hasta</label><input id="t" type="date" (change)="to = $any($event.target).value; load()"></div>
    </div>

    @if (loading()) { <div class="card" style="padding:20px"><div class="skeleton"></div></div> }
    @else if (!id) { <div class="card empty"><strong>Elige un apartamento</strong>Verás su historial de cuotas y pagos aquí.</div> }
    @if (!loading() && id && data(); as s) {
      <article class="card statement">
        <header class="st-head">
          <div><h2 style="font-size:1.3rem">{{ auth.user()?.tenantName }}</h2>
            <div class="muted">Estado de cuenta al {{ s.generatedAt.slice(0, 10) }}</div></div>
          <dl>
            <dt>Apartamento</dt><dd><strong>{{ s.apartment.code }}</strong> {{ s.apartment.description }}</dd>
            <dt>Propietario</dt><dd>{{ s.owner.fullName }} ({{ s.owner.documentId }})</dd>
            <dt>Cuota mensual</dt><dd>{{ s.apartment.feeAmount | money }}</dd>
          </dl>
        </header>

        <div class="st-totals">
          <div><small>Saldo anterior</small><strong>{{ s.openingBalance | money }}</strong></div>
          <div><small>Cargos</small><strong>{{ s.totalDebits | money }}</strong></div>
          <div><small>Pagos</small><strong class="credit">{{ s.totalCredits | money }}</strong></div>
          <div class="due"><small>Saldo adeudado</small><strong [class.debt]="s.apartment.currentBalance > 0">{{ s.apartment.currentBalance | money }}</strong></div>
          @if (s.overdueAmount > 0) { <div class="due"><small>De lo cual vencido</small><strong class="debt">{{ s.overdueAmount | money }}</strong></div> }
        </div>

        @if (!s.movements.length) { <div class="empty">No hay movimientos en este rango.</div> }
        @else {
          <div class="table-wrap"><table class="ledger">
            <thead><tr><th>Fecha</th><th>Detalle</th><th class="num">Cargo</th><th class="num">Pago</th><th class="num">Saldo</th></tr></thead>
            <tbody>
              @for (m of s.movements; track $index) {
                <tr [class.voided]="m.type === 'PAYMENT_VOID'">
                  <td class="nowrap">{{ m.date }}</td><td>{{ m.description }}</td>
                  <td class="num">{{ m.debit ? (m.debit | money) : '' }}</td>
                  <td class="num credit">{{ m.credit ? (m.credit | money) : '' }}</td>
                  <td class="num"><strong>{{ m.balance | money }}</strong></td>
                </tr>
              }
            </tbody>
            <tfoot><tr><td colspan="2">Saldo del periodo</td><td class="num">{{ s.totalDebits | money }}</td><td class="num">{{ s.totalCredits | money }}</td><td class="num">{{ s.closingBalance | money }}</td></tr></tfoot>
          </table></div>
        }
      </article>
    }`,
})
export class StatementComponent implements OnInit {
  @Input() id?: string;               // :id de la ruta (withComponentInputBinding)
  auth = inject(AuthService);
  private api = inject(StatementsApi);
  private apartmentsApi = inject(ApartmentsApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  apartments = signal<Apartment[]>([]); data = signal<Statement | null>(null); loading = signal(false);
  from = ''; to = '';

  ngOnInit() {
    this.apartmentsApi.list('', false, 0, 100).subscribe(r => this.apartments.set(r.content));
    this.load();
  }

  pick(id: string) { this.router.navigate(['/statements', id]); this.id = id; this.load(); }
  print() { window.print(); }

  load() {
    if (!this.id) { this.data.set(null); return; }
    this.loading.set(true);
    this.api.get(this.id, this.from, this.to).subscribe({
      next: s => { this.data.set(s); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.error(errorMessage(e)); },
    });
  }
}
