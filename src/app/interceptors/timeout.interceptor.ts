import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout } from 'rxjs';

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const DEFAULT_TIMEOUT = 5000;
  const timeoutValue = req.headers.get('timeout') || DEFAULT_TIMEOUT;

  const customTimeoutHeader = req.headers.get('timeout');
  const timeoutDuration = customTimeoutHeader ? Number(customTimeoutHeader) : DEFAULT_TIMEOUT;

  const cleanRequest = customTimeoutHeader
    ? req.clone({ headers: req.headers.delete('timeout') })
    : req;

  return next(cleanRequest).pipe(
    timeout({
      first: timeoutDuration,
      with: () => throwError(() => new Error(`Request timed out after ${timeoutValue}ms`)),
    }),
    catchError((error) => {
      console.error(error);
      return throwError(() => error);
    }),
  );
};
