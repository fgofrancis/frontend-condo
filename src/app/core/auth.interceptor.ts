import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const isAuthCall = (url: string) => /\/api\/auth\/(login|platform\/login|refresh|logout)/.test(url);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!req.url.startsWith('/api/') || isAuthCall(req.url)) return next(req);

  const withToken = (r: HttpRequest<unknown>, t: string | null) =>
    t ? r.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : r;

  return next(withToken(req, auth.token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(switchMap(t => {
        if (!t) { router.navigate(['/login'], { queryParams: { expired: 1 } }); return throwError(() => err); }
        return next(withToken(req, t));
      }));
    }));
};
