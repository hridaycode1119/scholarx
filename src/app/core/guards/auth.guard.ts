import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

/**
 * Ensures user is authenticated before allowing access.
 * Redirects unauthenticated users to /login.
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Not authenticated, redirect to login with query param
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Ensures user has one of the required roles.
 * Prevents cross-portal access (e.g., student accessing mentor or admin pages).
 */
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const currentRole = authService.userRole();
    if (currentRole && allowedRoles.includes(currentRole)) {
      return true;
    }

    // Role mismatch: redirect user to their authorized portal
    const fallbackRoute = currentRole ? authService.getPortalDefaultRoute(currentRole) : '/login';
    return router.createUrlTree([fallbackRoute]);
  };
};

/**
 * Public guard for /login and /register pages.
 * If user is already authenticated, redirects them to their respective portal dashboard.
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const role = authService.userRole();
    const target = role ? authService.getPortalDefaultRoute(role) : '/student/dashboard';
    return router.createUrlTree([target]);
  }

  return true;
};
