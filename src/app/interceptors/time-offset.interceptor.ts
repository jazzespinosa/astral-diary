import { HttpInterceptorFn } from '@angular/common/http';

export const timeOffsetInterceptor: HttpInterceptorFn = (req, next) => {
  const timeOffset = new Date().getTimezoneOffset();
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Timezone-Offset': timeOffset.toString(),
    },
  });
  return next(modifiedReq);
};
