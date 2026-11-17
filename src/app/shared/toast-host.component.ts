import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of toasts.items(); track t.id) {
        <div class="toast" [class.toast-error]="t.kind === 'error'">
          <span>{{ t.text }}</span>
          <button class="icon-btn" aria-label="Cerrar" (click)="toasts.dismiss(t.id)">✕</button>
        </div>
      }
    </div>`,
})
export class ToastHostComponent { toasts = inject(ToastService); }
