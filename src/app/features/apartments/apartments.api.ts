import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page } from '../../core/models';

export interface Apartment { id: string; code: string; description?: string; ownerId: string; ownerName: string; feeAmount: number; balance: number; active: boolean; }
export interface ApartmentInput { code: string; description: string; ownerId: string; feeAmount: number; }
export interface Summary { activeApartments: number; withDebt: number; totalBalance: number; }

@Injectable({ providedIn: 'root' })
export class ApartmentsApi {
  private http = inject(HttpClient);
  list(q = '', debtOnly = false, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size).set('debtOnly', debtOnly);
    if (q) params = params.set('q', q);
    return this.http.get<Page<Apartment>>('/api/apartments', { params });
  }
  summary() { return this.http.get<Summary>('/api/apartments/summary'); }
  create(b: ApartmentInput) { return this.http.post<Apartment>('/api/apartments', b); }
  update(id: string, b: ApartmentInput) { return this.http.put<Apartment>(`/api/apartments/${id}`, b); }
  setActive(id: string, value: boolean) { return this.http.patch<void>(`/api/apartments/${id}/active`, null, { params: { value } }); }
}
