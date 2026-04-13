import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { CanActivateChildFn, CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthService } from 'app/services/auth.service';
import { GeneralAppService } from 'app/services/general-app.service';
import { map, take } from 'rxjs';

const waitForUser = () => {
  return authState(inject(Auth)).pipe(take(1));
};

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const generalAppService = inject(GeneralAppService);

  const result = waitForUser().pipe(map((user) => !!user || router.createUrlTree(['/auth'])));

  result.subscribe((res) => {
    if (res !== true) {
      generalAppService.setWarningToast('Please login to access this page.');
    }
  });

  return result;
};

export const authChildGuard: CanActivateChildFn = (route, state) => {
  const router = inject(Router);
  const generalAppService = inject(GeneralAppService);

  const result = waitForUser().pipe(map((user) => !!user || router.createUrlTree(['/auth'])));

  result.subscribe((res) => {
    if (res !== true) {
      generalAppService.setWarningToast('Please login to access this page.');
    }
  });

  return result;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return waitForUser().pipe(map((user) => (user ? router.createUrlTree(['/home']) : true)));
};
