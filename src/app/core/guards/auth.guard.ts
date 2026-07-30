import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const stateVal = authService.authState();

  if (stateVal.isLoading) {
    return true; // Let initial auth check complete asynchronously
  }

  if (stateVal.isAuthenticated && !stateVal.isMfaPending) {
    return true;
  }

  if (stateVal.isMfaPending) {
    return router.createUrlTree(['/mfa']);
  }

  return router.createUrlTree(['/login']);
};