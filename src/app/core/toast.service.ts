import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; kind: 'ok' | 'error'; text: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);
  private n = 0;
  ok(text: string) { this.push('ok', text); }
  error(text: string) { this.push('error', text); }
  dismiss(id: number) { this.items.update(l => l.filter(t => t.id !== id)); }
  private push(kind: Toast['kind'], text: string) {
    const id = ++this.n;
    this.items.update(l => [...l, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 7000 : 3500);
  }
}
