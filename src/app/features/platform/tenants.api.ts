import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page } from '../../core/models';

export interface TenantInfo {
  id: string; code: string; name: string; address?: string; contactEmail?: string; phone?: string;
  active: boolean; createdAt: string; apartments: number; totalBalance: number; users: number;
}
export interface TenantAdminInput { fullName: string; email: string; password: string; }
export interface CreateTenantInput { code: string; name: string; address: string; contactEmail: string; phone: string; admin: TenantAdminInput; }
export type UpdateTenantInput = Omit<CreateTenantInput, 'code' | 'admin'>;
export type UserRole = 'ADMIN' | 'TREASURER' | 'VIEWER';
export interface TenantUser { id: string; email: string; fullName: string; role: UserRole; enabled: boolean; locked: boolean; }
export interface TenantUserInput { fullName: string; email: string; role: UserRole; password: string; }
export const ROLE_LABELS: Record<UserRole, string> = { ADMIN: 'Administrador', TREASURER: 'Tesorería', VIEWER: 'Solo lectura' };

@Injectable({ providedIn: 'root' })
export class TenantsApi {
  private http = inject(HttpClient);
  private base = '/api/platform/tenants';
  list(q: string, page = 0, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<Page<TenantInfo>>(this.base, { params });
  }
  create(b: CreateTenantInput) { return this.http.post<TenantInfo>(this.base, b); }
  update(id: string, b: UpdateTenantInput) { return this.http.put<TenantInfo>(`${this.base}/${id}`, b); }
  setActive(id: string, value: boolean) { return this.http.patch<void>(`${this.base}/${id}/active`, null, { params: { value } }); }
  users(id: string) { return this.http.get<TenantUser[]>(`${this.base}/${id}/users`); }
  createUser(id: string, b: TenantUserInput) { return this.http.post<TenantUser>(`${this.base}/${id}/users`, b); }
  resetPassword(id: string, userId: string, password: string) { return this.http.put<void>(`${this.base}/${id}/users/${userId}/password`, { password }); }
  setUserEnabled(id: string, userId: string, value: boolean) { return this.http.patch<void>(`${this.base}/${id}/users/${userId}/enabled`, null, { params: { value } }); }
}
