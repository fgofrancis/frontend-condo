import { Routes } from '@angular/router';
export const ROUTES: Routes = [{ path: '', loadComponent: () => import('./apartments.component').then(m => m.ApartmentsComponent) }];
