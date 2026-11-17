import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page } from '../../core/models';

export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export interface Fee { id: string; apartmentId: string; apartmentCode: string; ownerName: string; period: string; concept: string; amount: number; paidAmount: number; remaining: number; dueDate: string; status: FeeStatus; overdue: boolean; }
export interface GenerateResult { created: number; skipped: number; }

@Injectable({ providedIn: 'root' })
export class FeesApi {
  private http = inject(HttpClient);
  list(f: { period?: string; status?: string; overdueOnly?: boolean }, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size).set('overdueOnly', !!f.overdueOnly);
    if (f.period) params = params.set('period', f.period);
    if (f.status) params = params.set('status', f.status);
    return this.http.get<Page<Fee>>('/api/fees', { params });
  }
  generate(b: { period: string; dueDate: string; concept: string }) { return this.http.post<GenerateResult>('/api/fees/generate', b); }
  cancel(id: string) { return this.http.delete<void>(`/api/fees/${id}`); }
}
