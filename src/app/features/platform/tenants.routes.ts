import { Routes } from '@angular/router';
export const ROUTES: Routes = [
    { path: '', loadComponent: () => import('./tenants.component').then(m => m.TenantsComponent) }
];
