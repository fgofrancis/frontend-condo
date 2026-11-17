import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { AuthResponse, Profile, Role } from './models';

const XHR = { 'X-Requested-With': 'XMLHttpRequest' };

/**
 * El access token vive SOLO en memoria (no localStorage): un XSS no puede robarlo para uso posterior.
 * La sesión se recupera al recargar con la cookie HttpOnly del refresh token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private _token = signal<string | null>(null);
  readonly user = signal<Profile | null>(null);
  readonly isLoggedIn = computed(() => !!this.user());
  private refreshing$?: Observable<string | null>;

  get token() { return this._token(); }

  login(tenantCode: string, email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { tenantCode, email, password }).pipe(tap(r => this.apply(r)));
  }

  /** Una sola renovación en vuelo aunque varias peticiones fallen con 401 a la vez. */
  refresh(): Observable<string | null> {
    this.refreshing$ ??= this.http.post<AuthResponse>('/api/auth/refresh', {}, { headers: XHR }).pipe(
      tap(r => this.apply(r)),
      map(r => r.accessToken as string | null),
      catchError(() => { this.clear(); return of(null); }),
      finalize(() => (this.refreshing$ = undefined)),
      shareReplay(1));
    return this.refreshing$;
  }

  logout() {
    this.http.post('/api/auth/logout', {}, { headers: XHR }).pipe(catchError(() => of(null))).subscribe();
    this.clear();
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]) { const u = this.user(); return !!u && roles.includes(u.role); }

  private apply(r: AuthResponse) { this._token.set(r.accessToken); this.user.set(r.user); }
  clear() { this._token.set(null); this.user.set(null); }
}
