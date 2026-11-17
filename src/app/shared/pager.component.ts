import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pager',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <nav class="pager" aria-label="Paginación">
        <button class="btn btn-ghost" [disabled]="page === 0" (click)="go.emit(page - 1)">Anterior</button>
        <span>Página {{ page + 1 }} de {{ totalPages }}</span>
        <button class="btn btn-ghost" [disabled]="page + 1 >= totalPages" (click)="go.emit(page + 1)">Siguiente</button>
      </nav>
    }`,
})
export class PagerComponent {
  @Input() page = 0;
  @Input() totalPages = 0;
  @Output() go = new EventEmitter<number>();
}
