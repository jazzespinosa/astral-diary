import { DestroyRef, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
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
import { AuthError, LoginResponseDto, UserModel } from 'app/models/auth.models';
import { Router } from '@angular/router';
import { EncryptionService } from './encryption.service';
import { ConfirmationService } from 'primeng/api';
import { GeneralAppService } from './general-app.service';
import { CachingService } from './caching.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private encryptionService = inject(EncryptionService);
  private confirmationService = inject(ConfirmationService);
  private cachingService = inject(CachingService);
  private generalAppService = inject(GeneralAppService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly functions = inject(Functions);

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
      if (!user) {
        this.setActiveUser(null);
        this.encryptionService.clearSessionKey();
      }
    });
  }

  private isProcessingAuth = false;

  async initializeAuth(): Promise<void> {
    // Don't run on server
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const redirectResult = await getRedirectResult(this.auth);

      if (redirectResult && redirectResult.user) {
        if (redirectResult.user.email) {
          await this.processAuthenticatedUser(redirectResult.user, 'initializeAuth (redirect)');
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
            await this.processAuthenticatedUser(user, 'initializeAuth (stateChange)');
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

  private async processAuthenticatedUser(user: User, source: string): Promise<UserModel | null> {
    if (this.activeUser() && this.activeUser()?.email === user.email) {
      return this.activeUser();
    }

    if (this.isProcessingAuth) {
      return this.activeUser();
    }

    this.isProcessingAuth = true;
    try {
      const userData = await firstValueFrom(this.validateWithBackend(user));
      console.log(`[Auth] validate login called from ${source}`);

      // Get user pepper (catch errors — pepper may not exist yet)
      const getUserPepperFn = httpsCallable<
        object,
        { userPepper: string | null; success: boolean }
      >(this.functions, 'getUserPepper');

      let userPepper: string | null = null;
      try {
        const userPepperResult = await getUserPepperFn({});
        userPepper = userPepperResult.data.userPepper;
        console.log('✅ User pepper retrieved:', !!userPepper);
      } catch (pepperError) {
        console.warn('[Auth] getUserPepper failed (pepper may not exist yet):', pepperError);
      }

      // If user pepper is not found, generate it and re-fetch
      if (!userPepper) {
        console.log('[Auth] No pepper found, generating...');
        await this.initializeEncryption();
        const retryResult = await getUserPepperFn({});
        userPepper = retryResult.data.userPepper;
      }

      if (!userPepper) {
        throw new Error('Unable to retrieve user pepper after generation.');
      }

      this.setActiveUser(userData);
      await this.encryptionService.initSessionKey(userPepper);
      return userData;
    } catch (error) {
      console.error(`[Auth] Error processing user from ${source}:`, error);
      return null;
    } finally {
      this.isProcessingAuth = false;
    }
  }

  async initializeEncryption(): Promise<void> {
    try {
      const initializeEncryption = httpsCallable(this.functions, 'generateAndSaveUserPepper');

      const result = await initializeEncryption({});
      console.log('✅ Encryption initialized:', result);
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw error;
    }
  }

  loginGoogle() {
    return this.signOutIfNeeded().pipe(
      switchMap(() => from(signInWithRedirect(this.auth, this.googleProvider))),
    );
  }

  login(email: string, password: string): Observable<UserModel> {
    return this.signOutIfNeeded().pipe(
      switchMap(() => from(signInWithEmailAndPassword(this.auth, email, password))),
      switchMap((userCredential) =>
        from(this.processAuthenticatedUser(userCredential.user, 'login')).pipe(
          map((userData) => {
            if (!userData) throw new Error('Login validation failed');
            return userData;
          }),
        ),
      ),
      catchError((error) => throwError(() => this.mapLoginError(error))),
    );
  }

  register(name: string, email: string, password: string) {
    return this.signOutIfNeeded().pipe(
      switchMap(() =>
        from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
          switchMap(async (userCredential) => {
            await updateProfile(userCredential.user, { displayName: name });

            // Generate user pepper during registration so it's ready for first login
            await this.initializeEncryption();
            console.log('[Auth] User pepper created during registration');

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
