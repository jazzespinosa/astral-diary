import { DestroyRef, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateCurrentUser,
  updateProfile,
  User,
  UserCredential,
} from '@angular/fire/auth';
import { environment } from 'environments/environment';
import {
  catchError,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthError, LoginResponseDto, SignUpResponseDto, UserModel } from 'app/models/auth.models';
import { Router } from '@angular/router';
import { EncryptionService } from './encryption.service';
import { ConfirmationService } from 'primeng/api';
import { GeneralAppService } from './general-app.service';
import { ApiClientService } from './api-client.service';
import { CachingService } from './caching.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private encryptionService = inject(EncryptionService);
  private confirmationService = inject(ConfirmationService);
  private apiClientService = inject(ApiClientService);
  private cachingService = inject(CachingService);
  private generalAppService = inject(GeneralAppService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private readonly BASE_URL = environment.backendUrl;
  private googleProvider = new GoogleAuthProvider();

  readonly user$ = authState(this.auth);

  // ========== user ==========
  private readonly _activeUser = signal<UserModel | null>(null);
  readonly activeUser = this._activeUser.asReadonly();
  setActiveUser(user: UserModel | null) {
    this._activeUser.set(user);
  }
  updateUserAvatar(avatar: string) {
    const user = this._activeUser();
    if (user) {
      this._activeUser.set({ ...user, avatar });
    }
  }

  constructor() {
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (user) => {
      if (user && user.emailVerified && !this.activeUser()) {
        console.log('[AuthService] Normalizing user from constructor state');
        const userData = await firstValueFrom(this.validateWithBackend(user));
        this.setActiveUser(userData);
      } else if (!user) {
        this.setActiveUser(null);
      }
    });
  }

  async initializeAuth(): Promise<void> {
    // Don't run on server
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    try {
      const redirectResult = await getRedirectResult(this.auth);

      if (redirectResult && redirectResult.user) {
        if (redirectResult.user.email) {
          console.log('[AuthService] Normalizing user from redirect state');
          const userData = await firstValueFrom(this.validateWithBackend(redirectResult.user));
          this.setActiveUser(userData);
          await this.encryptionService.initSessionKey();
          this.router.navigate(['/home']);
          return;
        }
      }
    } catch (error: any) {
      // Handle specific redirect errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.error('[Auth] Popup was closed by user');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.error('[Auth] Popup request was cancelled');
      } else if (error.code === 'auth/redirect-cancelled-by-user') {
        console.error('[Auth] Redirect was cancelled by user');
      } else {
        console.error('[Auth] Redirect result error:', error);
      }
    }

    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        async (user) => {
          if (user && user.emailVerified) {
            console.log('[AuthService] Normalizing user from onAuthStateChanged state');
            const userData = await firstValueFrom(this.validateWithBackend(user));
            this.setActiveUser(userData);
            await this.encryptionService.initSessionKey();
          }
          unsubscribe(); // Unsubscribe after first result
          resolve();
        },
        (error) => {
          console.error('[Auth] Auth state error:', error);
          resolve(); // Resolve anyway to prevent hanging
        },
      );
    });
  }

  loginGoogle() {
    return this.signOutIfNeeded().pipe(
      switchMap(() => from(signInWithRedirect(this.auth, this.googleProvider))),
    );
  }

  login(email: string, password: string): Observable<UserModel> {
    return this.signOutIfNeeded().pipe(
      switchMap(() => from(signInWithEmailAndPassword(this.auth, email, password))),
      switchMap((userCredential) => this.validateWithBackend(userCredential.user)),
      catchError((error) => throwError(() => this.mapLoginError(error))),
      tap(async (userData) => {
        this.setActiveUser(userData);
        await this.encryptionService.initSessionKey();
      }),
    );
  }

  register(name: string, email: string, password: string) {
    return this.signOutIfNeeded().pipe(
      switchMap(() =>
        from(
          createUserWithEmailAndPassword(this.auth, email, password).then((userCredential) => {
            updateProfile(userCredential.user, { displayName: name });
            return userCredential;
          }),
        ),
      ),
      switchMap((cred) => {
        return from(sendEmailVerification(cred.user)).pipe(
          switchMap(() => from(signOut(this.auth))),
          switchMap(() => of(cred.user)),
        );
      }),
      catchError((error) => throwError(() => this.mapRegisterError(error))),
    );
  }

  private getAvatar(): Observable<string | null> {
    return this.apiClientService.getUserAvatar().pipe(
      map((response) => response.avatar),
      catchError((error) => {
        console.error('[Auth] Failed to get avatar:', error);
        return of(null);
      }),
    );
  }

  private validateWithBackend(user: User): Observable<UserModel> {
    return from(user.getIdToken(true)).pipe(
      switchMap((token) =>
        this.http.post<LoginResponseDto>(
          `${this.BASE_URL}/user/login`,
          {
            Email: user.email,
            Name: user.displayName || user.email?.substring(0, user.email.indexOf('@')),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      ),
      map((response) => ({
        userId: response.userId,
        email: response.email,
        name: response.name,
        avatar: response.avatar,
      })),
    );
  }

  signOutIfNeeded(): Observable<void> {
    if (this.auth.currentUser) {
      this.encryptionService.clearSessionKey();
      this.cachingService.clearAllCache();
      return from(signOut(this.auth));
    }

    return of(undefined);
  }

  private mapLoginError(error: any): AuthError {
    this.signOutIfNeeded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setActiveUser(null);
        },
        error: (error) => {
          console.error('[Auth] Logout error:', error);
        },
      });

    if (error.message.includes('You must verify your email before signing in.')) {
      return {
        message: 'You must verify your email before signing in.',
      };
    }

    const errorMessages: Record<string, string> = {
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/user-not-found': 'User not found.',
      'auth/user-disabled': 'User is disabled. Please contact administrator.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/email-already-in-use': 'Email already in use.',
    };

    return {
      message: errorMessages[error.code] || 'Login failed. Try again.',
    };
  }

  private mapRegisterError(error: any): AuthError {
    const errorMessages: Record<string, string> = {
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/email-already-in-use': 'Email already in use.',
    };

    return {
      message: errorMessages[error.code] || 'Signup failed. Try again.',
    };
  }

  onLogout() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to logout?',
      header: 'Confirm Logout',
      icon: 'fa-solid fa-exclamation',
      dismissableMask: true,
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Logout',
        severity: 'danger',
      },
      accept: () => {
        this.signOutIfNeeded()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.setActiveUser(null);
              this.router.navigate(['auth']);
              this.generalAppService.setSuccessToast('Logged out successfully');
            },
            error: (error) => {
              console.error('[Auth] Logout error:', error);
              this.generalAppService.setErrorToast('Logout failed. Try again.');
            },
          });
      },
    });
  }
}
