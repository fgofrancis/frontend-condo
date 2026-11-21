import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/** Rutas de un condominio: el operador de plataforma no entra (no tiene tenant). */
export const tenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isPlatform() ? inject(Router).createUrlTree(['/platform/tenants']) : true;
};

/** Rutas de plataforma: solo PLATFORM_ADMIN. La autorización real es del backend. */
export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isPlatform() ? true : inject(Router).createUrlTree(['/apartments']);
};

/** Redirige la raíz a la pantalla de inicio que corresponde al tipo de usuario. */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.isPlatform() ? '/platform/tenants' : '/apartments']);
};

