import { Routes } from '@angular/router';
import { authGuard, homeGuard, platformGuard, tenantGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
      // --- Plataforma (super-admin) ---
      { path: 'platform/tenants', canActivate: [platformGuard], loadChildren: () => import('./features/platform/tenants.routes').then(m => m.ROUTES) },
      // --- Condominio ---
      { path: 'apartments', canActivate: [tenantGuard], loadChildren: () => import('./features/apartments/apartments.routes').then(m => m.ROUTES) },
      { path: 'owners', canActivate: [tenantGuard], loadChildren: () => import('./features/owners/owners.routes').then(m => m.ROUTES) },
      { path: 'fees', canActivate: [tenantGuard], loadChildren: () => import('./features/fees/fees.routes').then(m => m.ROUTES) },
      { path: 'payments', canActivate: [tenantGuard], loadChildren: () => import('./features/payments/payments.routes').then(m => m.ROUTES) },
      { path: 'statements', canActivate: [tenantGuard], loadChildren: () => import('./features/statements/statements.routes').then(m => m.ROUTES) },
    ],
  },
  { path: '**', redirectTo: '' },
];

