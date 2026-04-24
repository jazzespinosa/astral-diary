import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/services/auth.service';
import { GeneralAppService } from 'app/services/general-app.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const generalAppService = inject(GeneralAppService);

  if (authService.activeUser()) {
    return true;
  }

  generalAppService.setWarningToast('Please login to access this page.');
  return router.createUrlTree(['/auth']);
};

export const authChildGuard: CanActivateChildFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const generalAppService = inject(GeneralAppService);

  if (authService.activeUser()) {
    return true;
  }

  generalAppService.setWarningToast('Please login to access this page.');
  return router.createUrlTree(['/auth']);
};

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.activeUser()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
