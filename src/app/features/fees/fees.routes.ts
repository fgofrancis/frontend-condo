import { Routes } from '@angular/router';
export const ROUTES: Routes = [{ path: '', loadComponent: () => import('./fees.component').then(m => m.FeesComponent) }];
