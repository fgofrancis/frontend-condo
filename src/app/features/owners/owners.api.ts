import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page } from '../../core/models';

export interface Owner { id: string; fullName: string; documentId: string; email?: string; phone?: string; active: boolean; }
export type OwnerInput = Pick<Owner, 'fullName' | 'documentId' | 'email' | 'phone'>;

@Injectable({ providedIn: 'root' })
export class OwnersApi {
  private http = inject(HttpClient);
  list(q: string, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<Page<Owner>>('/api/owners', { params });
  }
  create(b: OwnerInput) { return this.http.post<Owner>('/api/owners', b); }
  update(id: string, b: OwnerInput) { return this.http.put<Owner>(`/api/owners/${id}`, b); }
  setActive(id: string, value: boolean) { return this.http.patch<void>(`/api/owners/${id}/active`, null, { params: { value } }); }
}
