import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { GeneralAppService } from 'app/services/general-app.service';
import { inject } from '@angular/core';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const appService = inject(GeneralAppService);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 0) {
        appService.setCustomToastMessage({
          severity: 'error',
          summary: 'Server Error',
          detail: 'Unable to connect to the server. Please try again later.',
        });
      } else if (error.status >= 500) {
        appService.setCustomToastMessage({
          severity: 'error',
          summary: 'Server Error',
          detail: error.message,
        });
      } else if (error.status >= 400) {
        appService.setCustomToastMessage({
          severity: 'error',
          summary: 'Client Error',
          detail: error.message,
        });
      }
      console.error(error);
      return throwError(() => error);
    }),
  );
};
