import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AdminAuthService} from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = async (_route, state) => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);
  if (await adminAuth.validateSession()) return true;
  return router.createUrlTree(['/admin/login'], {queryParams: {returnUrl: state.url}});
};
