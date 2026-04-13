import {
  ApplicationConfig,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, RouteReuseStrategy, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
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
    providePrimeNG({
      theme: {
        preset: AstralPreset,
      },
    }),
    MessageService,
    ConfirmationService,
  ],
};

function initializeAuthFactory(): void {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);

  if (!isPlatformBrowser(platformId)) {
    return;
  }
  authService.initializeAuth();
}
