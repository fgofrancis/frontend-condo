import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page } from '../../core/models';

export type Method = 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD';
export interface Allocation { feeId: string; period: string; concept: string; amount: number; }
export interface Payment {
  id: string; number: number; receipt: string; apartmentId: string; apartmentCode: string; ownerName: string; amount: number;
  paymentDate: string; method: Method; reference?: string; notes?: string; status: 'ACTIVE' | 'CANCELLED';
  cancelledAt?: string; cancelledBy?: string; cancelReason?: string; allocations: Allocation[];
}
export interface PaymentInput { apartmentId: string; amount: number; paymentDate: string; method: Method; reference: string; notes: string; }
export const METHODS: Record<Method, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CHECK: 'Cheque', CARD: 'Tarjeta' };

@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private http = inject(HttpClient);
  list(f: { status?: string; from?: string; to?: string }, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [k, v] of Object.entries(f)) if (v) params = params.set(k, v);
    return this.http.get<Page<Payment>>('/api/payments', { params });
  }
  register(b: PaymentInput) { return this.http.post<Payment>('/api/payments', b); }
  cancel(id: string, reason: string) { return this.http.post<Payment>(`/api/payments/${id}/cancel`, { reason }); }
}
