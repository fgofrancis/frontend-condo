import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

/** Diálogo nativo <dialog>: foco atrapado, Esc para cerrar y accesible sin librerías. */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <dialog #d class="modal" (cancel)="closed.emit()" (click)="backdrop($event)">
      <div class="modal-body">
        <header class="modal-head">
          <h2>{{ title }}</h2>
          <button class="icon-btn" type="button" aria-label="Cerrar" (click)="closed.emit()">✕</button>
        </header>
        <ng-content />
      </div>
    </dialog>`,
})
export class ModalComponent implements AfterViewInit {
  @Input({ required: true }) title = '';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('d', { static: true }) dlg!: ElementRef<HTMLDialogElement>;
  ngAfterViewInit() { this.dlg.nativeElement.showModal(); }
  backdrop(e: MouseEvent) { if (e.target === this.dlg.nativeElement) this.closed.emit(); }
}
