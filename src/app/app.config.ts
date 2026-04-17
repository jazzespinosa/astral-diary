import {
  ApplicationConfig,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from './services/auth.service';
import { environment } from 'environments/environment';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomReuseStrategy } from './strategies/custom-reuse-strategy';
import { timeoutInterceptor } from './interceptors/timeout.interceptor';
import { timeOffsetInterceptor } from './interceptors/time-offset.interceptor';
import { AstralPreset } from '../preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(initializeAuthFactory),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        timeOffsetInterceptor,
        timeoutInterceptor,
        errorInterceptor,
      ]),
    ),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFunctions(() => getFunctions(undefined, 'asia-southeast1')),
    providePrimeNG({
      theme: {
        preset: AstralPreset,
        options: {
          darkModeSelector: false,
        },
      },
    }),
    MessageService,
    ConfirmationService,
  ],
};

function initializeAuthFactory(): Promise<void> {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);

  if (!isPlatformBrowser(platformId)) {
    return Promise.resolve();
  }
  return authService.initializeAuth();
}
