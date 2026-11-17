import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { authGuard } from './guards/auth-guard';
import { Products } from './products/products';

export const routes: Routes = [
  { path: '', component: Products, pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login)
  },
  {
    path: 'panel',
    loadComponent: () => import('./panel/panel').then((m) => m.Panel),
  },
  {
    path: 'usuario',
    loadComponent: () => import('./usuario/usuario').then((m) => m.Usuario),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
