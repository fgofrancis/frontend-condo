import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface Movement { date: string; type: 'FEE' | 'PAYMENT' | 'PAYMENT_VOID'; description: string; reference: string; debit: number; credit: number; balance: number; }
export interface Statement {
  apartment: { id: string; code: string; description?: string; feeAmount: number; currentBalance: number };
  owner: { id: string; fullName: string; documentId: string; email?: string; phone?: string };
  from?: string; to?: string; generatedAt: string;
  openingBalance: number; totalDebits: number; totalCredits: number; closingBalance: number; overdueAmount: number;
  movements: Movement[];
}

@Injectable({ providedIn: 'root' })
export class StatementsApi {
  private http = inject(HttpClient);
  get(apartmentId: string, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Statement>(`/api/statements/apartments/${apartmentId}`, { params });
  }
}
