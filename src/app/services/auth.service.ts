import { Injectable, PLATFORM_ID, signal } from '@angular/core';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Auth,
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  private readonly BASE_URL = environment.backendUrl;
  private googleProvider = new GoogleAuthProvider();

  // ========== user ==========
  private readonly activeUser = signal<UserModel | null>(null);
  readonly activeUser$ = this.activeUser.asReadonly();
  setActiveUser(user: UserModel | null) {
    this.activeUser.set(user);
  }

  async initializeAuth(): Promise<void> {
    // Don't run on server
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    try {
      const redirectResult = await getRedirectResult(this.auth);

      if (redirectResult && redirectResult.user) {
        console.log('[Auth] Redirect result found:', redirectResult.user.email);
        // Validate with backend for Google sign-in
        // const userData = await firstValueFrom(this.validateWithBackendGoogle(redirectResult));
        // if (userData && userData.email) {
        //   this.setUser(userData);
        //   this.router.navigate(['/home']);
        //   return; // Exit early - we've handled the auth
        // }

        if (redirectResult.user.email && redirectResult.user.displayName) {
          this.setActiveUser({
            email: redirectResult.user.email,
            name: redirectResult.user.displayName,
          });
          this.router.navigate(['/home']);
          return;
        }
      }
    } catch (error: any) {
      // Handle specific redirect errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('[Auth] Popup was closed by user');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('[Auth] Popup request was cancelled');
      } else if (error.code === 'auth/redirect-cancelled-by-user') {
        console.log('[Auth] Redirect was cancelled by user');
      } else {
        console.error('[Auth] Redirect result error:', error);
      }
    }

    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => {
          if (user) {
            const email = user.email || '';
            const name =
              user.displayName || user.email?.substring(0, user.email.indexOf('@')) || '';
            const userData: UserModel = {
              email: email,
              name: name,
            };
            this.setActiveUser(userData);
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
      switchMap((userCredential) => this.validateWithBackend(userCredential)),
      catchError((error) => throwError(() => this.mapLoginError(error))),
      tap((userData) => {
        this.setActiveUser(userData);
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

  // private saveUserDataInBackend(
  //   userCredential: UserCredential,
  //   name: string,
  // ): Observable<UserModel> {
  //   return from(userCredential.user.getIdToken(true)).pipe(
  //     switchMap((token) =>
  //       this.http.post<SignUpResponseDto>(
  //         `${this.baseUrl}/api/user/signup`,
  //         {
  //           Email: userCredential.user.email,
  //           Name: name,
  //         },
  //         {
  //           headers: { Authorization: `Bearer ${token}` },
  //         },
  //       ),
  //     ),
  //     map((response) => ({
  //       email: response.email,
  //       name: response.name,
  //       isAnonymous: false,
  //     })),
  //   );
  // }

  private validateWithBackend(userCredential: UserCredential): Observable<UserModel> {
    return from(userCredential.user.getIdToken(true)).pipe(
      switchMap((token) =>
        this.http.post<LoginResponseDto>(
          `${this.BASE_URL}/user/login`,
          { Email: userCredential.user.email, Name: userCredential.user.displayName },
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
      })),
    );
  }

  private validateWithBackendGoogle(userCredential: UserCredential | null): Observable<UserModel> {
    if (!userCredential) {
      return of({} as UserModel);
    }
    return from(userCredential.user.getIdToken(true)).pipe(
      switchMap((token) =>
        this.http.post<LoginResponseDto>(
          `${this.BASE_URL}/user/login`,
          {
            Email: userCredential.user.email,
            Name: userCredential.user.displayName,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
      map((response) => ({
        email: response.email,
        name: response.name,
      })),
    );
  }

  signOutIfNeeded(): Observable<void> {
    if (this.auth.currentUser) {
      return from(signOut(this.auth));
    }

    return of(undefined);
  }

  private mapLoginError(error: any): AuthError {
    this.signOutIfNeeded();

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
}
