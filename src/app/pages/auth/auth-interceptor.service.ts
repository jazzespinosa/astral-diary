import { HttpInterceptorFn } from '@angular/common/http';
import { initializeApp } from '@angular/fire/app';
import { getAuth } from '@angular/fire/auth';
import { environment } from 'environments/environment';
import { from, switchMap } from 'rxjs';

export const AuthInterceptorService: HttpInterceptorFn = (req, next) => {
  const auth = getAuth(initializeApp(environment.firebaseConfig));

  // Skip if Authorization header already exists
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  return from(auth.authStateReady()).pipe(
    switchMap(() => {
      const user = auth.currentUser;

      if (!user) {
        console.log('AuthInterceptorService - no user');
        return next(req);
      }

      return from(user.getIdToken()).pipe(
        switchMap((token) => {
          const cloned = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next(cloned);
        }),
      );
    }),
  );
};
