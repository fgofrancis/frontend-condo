import { Component, Input } from '@angular/core';

const LABELS: Record<string, [string, string]> = {
  PENDING: ['Pendiente', 'warn'], PARTIAL: ['Abonada', 'info'], PAID: ['Pagada', 'ok'], CANCELLED: ['Anulada', 'mute'],
  ACTIVE: ['Vigente', 'ok'], OVERDUE: ['Vencida', 'bad'],
};

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge badge-{{ tone }}">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  label = ''; tone = 'mute';
  @Input() set status(s: string) { [this.label, this.tone] = LABELS[s] ?? [s, 'mute']; }
}
