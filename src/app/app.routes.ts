import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'mfa',
    loadComponent: () => import('./features/auth/mfa/mfa.component').then(m => m.MfaComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'expenses',
    canActivate: [authGuard],
    loadComponent: () => import('./features/expenses/expense-list/expense-list.component').then(m => m.ExpenseListComponent)
  },
  {
    path: 'cashflow',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cashflow/cashflow.component').then(m => m.CashflowComponent)
  },
  {
    path: 'savings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/savings/savings.component').then(m => m.SavingsComponent)
  },
  {
    path: 'nalangin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/nalangin/nalangin.component').then(m => m.NalanginComponent)
  },
  {
    path: 'import-export',
    canActivate: [authGuard],
    loadComponent: () => import('./features/import-export/import-export.component').then(m => m.ImportExportComponent)
  },
  {
    path: 'telegram-sync',
    canActivate: [authGuard],
    loadComponent: () => import('./features/telegram-sync/telegram-sync.component').then(m => m.TelegramSyncComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];