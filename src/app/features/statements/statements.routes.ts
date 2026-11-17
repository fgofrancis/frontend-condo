import { Routes } from '@angular/router';
export const ROUTES: Routes = [
  { path: '', loadComponent: () => import('./statement.component').then(m => m.StatementComponent) },
  { path: ':id', loadComponent: () => import('./statement.component').then(m => m.StatementComponent) },
];
