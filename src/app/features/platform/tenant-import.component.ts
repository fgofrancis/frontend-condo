import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { ImportReport, ImportResult, TenantInfo, TenantsApi } from './tenants.api';

const MAX_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-tenant-import',
  standalone: true,
  imports: [ModalComponent, MoneyPipe],
  template: `
    <app-modal [title]="'Importar datos · ' + tenant.name" (closed)="closed.emit()">
      @if (error()) { <div class="form-error" role="alert">{{ error() }}</div> }

      @if (result(); as r) {
        <p style="margin-top:0"><strong>Importación completada.</strong> Ya puedes entrar al condominio con su administrador.</p>
        <dl class="kpis">
          <div class="kpi"><dt>Propietarios</dt><dd>{{ r.owners }}</dd></div>
          <div class="kpi"><dt>Apartamentos</dt><dd>{{ r.apartments }}</dd></div>
          <div class="kpi"><dt>Cuotas</dt><dd>{{ r.fees }}</dd></div>
          <div class="kpi"><dt>Saldo pendiente</dt><dd class="debt">{{ r.totalBalance | money }}</dd></div>
        </dl>
        <div class="modal-foot"><button class="btn btn-primary" (click)="imported.emit()">Listo</button></div>
      } @else {
        <p class="muted" style="margin-top:0">Carga inicial desde Excel: propietarios, apartamentos, cuota mensual y saldo pendiente. Primero se valida el archivo sin guardar nada.</p>

        <div class="form-grid">
          <div class="field full">
            <label for="f">Archivo Excel (.xlsx, máx. 5 MB)</label>
            <input id="f" type="file" accept=".xlsx" (change)="pick($any($event.target).files?.[0])">
            <span class="hint"><button type="button" class="btn-text" style="padding:0" (click)="template()">Descargar plantilla</button></span>
          </div>
          <div class="field">
            <label for="c">Fecha de corte de los saldos</label>
            <input id="c" type="date" [value]="cutoff()" [max]="today" (change)="cutoff.set($any($event.target).value); report.set(null)">
            <span class="hint">Los saldos sin detalle se cargan como «Saldo inicial» en esa fecha.</span>
          </div>
        </div>

        <div class="actions" style="margin-top:14px">
          <button class="btn btn-ghost" [disabled]="!file() || !cutoff() || busy()" (click)="validate()">{{ busy() && !report() ? 'Validando…' : 'Validar archivo' }}</button>
        </div>

        @if (report(); as r) {
          <dl class="kpis" style="margin-top:18px">
            <div class="kpi"><dt>Propietarios</dt><dd>{{ r.owners }}</dd></div>
            <div class="kpi"><dt>Apartamentos</dt><dd>{{ r.apartments }}</dd></div>
            <div class="kpi"><dt>Cuotas</dt><dd>{{ r.fees }}</dd></div>
            <div class="kpi"><dt>Facturación mensual</dt><dd>{{ r.monthlyBilling | money }}</dd></div>
            <div class="kpi"><dt>Saldo pendiente</dt><dd [class.debt]="r.totalBalance > 0">{{ r.totalBalance | money }}</dd></div>
          </dl>

          @if (r.issues.length) {
            <div class="card table-wrap" style="max-height:240px;overflow:auto">
              <table>
                <thead><tr><th></th><th>Hoja</th><th>Fila</th><th>Campo</th><th>Detalle</th></tr></thead>
                <tbody>
                  @for (i of r.issues; track $index) {
                    <tr>
                      <td><span class="badge" [class.badge-bad]="i.error" [class.badge-warn]="!i.error">{{ i.error ? 'Error' : 'Aviso' }}</span></td>
                      <td>{{ i.sheet }}</td><td>{{ i.row }}</td><td>{{ i.field }}</td><td>{{ i.message }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (r.truncated) { <p class="muted">Se muestran solo los primeros {{ r.issues.length }} hallazgos. Corrige y vuelve a validar.</p> }
          }

          @if (r.valid) {
            <p style="margin-bottom:6px"><strong>El archivo es válido.</strong> @if (r.warningCount) { Revisa los {{ r.warningCount }} aviso(s) antes de continuar. }</p>
            <label class="check"><input type="checkbox" (change)="confirmed.set($any($event.target).checked)"> Confirmo que revisé los totales y quiero cargar estos datos</label>
          } @else {
            <div class="form-error" style="margin-top:12px">Hay {{ r.errorCount }} error(es). Corrige el Excel, selecciónalo de nuevo y vuelve a validar.</div>
          }
        }

        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!report()?.valid || !confirmed() || busy()" (click)="run()">{{ busy() && report() ? 'Importando…' : 'Importar datos' }}</button>
        </div>
      }
    </app-modal>`,
})
export class TenantImportComponent {
  @Input({ required: true }) tenant!: TenantInfo;
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();
  private api = inject(TenantsApi);
  private toast = inject(ToastService);
  today = new Date().toLocaleDateString('sv-SE');
  file = signal<File | null>(null); cutoff = signal(this.today);
  report = signal<ImportReport | null>(null); result = signal<ImportResult | null>(null);
  busy = signal(false); error = signal(''); confirmed = signal(false);

  pick(f?: File) {
    this.report.set(null); this.confirmed.set(false); this.error.set('');
    if (f && f.size > MAX_BYTES) { this.error.set('El archivo excede 5 MB'); this.file.set(null); return; }
    this.file.set(f ?? null);
  }

  template() {
    this.api.importTemplate().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'plantilla-carga-condominio.xlsx'; a.click();
        URL.revokeObjectURL(url);
      },
      error: e => this.error.set(errorMessage(e)),
    });
  }

  validate() {
    const f = this.file(); if (!f) return;
    this.busy.set(true); this.error.set(''); this.report.set(null); this.confirmed.set(false);
    this.api.validateImport(this.tenant.id, f, this.cutoff()).subscribe({
      next: r => { this.busy.set(false); this.report.set(r); },
      error: e => { this.busy.set(false); this.error.set(errorMessage(e)); },
    });
  }

  run() {
    const f = this.file(); if (!f || !this.report()?.valid) return;
    this.busy.set(true); this.error.set('');
    this.api.runImport(this.tenant.id, f, this.cutoff()).subscribe({
      next: r => { this.busy.set(false); this.result.set(r); this.toast.ok('Datos importados'); },
      error: e => { this.busy.set(false); this.error.set(errorMessage(e)); },
    });
  }
}
