import { Routes } from '@angular/router';
export const ROUTES: Routes = [{ path: '', loadComponent: () => import('./payments.component').then(m => m.PaymentsComponent) }];
