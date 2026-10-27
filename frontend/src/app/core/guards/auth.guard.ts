import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects unauthenticated users to /login, preserving the intended URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated) return true;
  inject(Router).navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
