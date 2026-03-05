import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ErrorMessageComponent } from 'app/shared/components/error-message/error-message.component';
import { MessageService } from 'primeng/api';
import { AuthService } from 'app/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthError } from 'app/models/auth.models';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-auth',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    InputTextModule,
    ButtonModule,
    ErrorMessageComponent,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private appService = inject(AppService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isLogin = signal(true); //form toggle
  isLoginPasswordVisible = signal(false);
  isRegisterPasswordVisible = signal(false);
  isSubmitLoading = signal(false);
  formSubmitted = false;

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32)]],
    });
  }

  submitLogin() {
    this.formSubmitted = true;
    this.isSubmitLoading.set(true);

    if (this.loginForm.invalid) {
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'Form is invalid',
      });
      this.isSubmitLoading.set(false);
      return;
    }

    const loginData = this.loginForm.value;
    console.log(this.loginForm.value);
    this.authService
      .login(loginData.email, loginData.password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appService.setToastMessage({
            severity: 'success',
            summary: 'Success',
            detail: 'Login successful',
          });
          this.router.navigate(['/home']);
        },
        error: (err: AuthError) => {
          this.isSubmitLoading.set(false);
          this.appService.setToastMessage({
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          });
        },
        complete: () => {
          this.isSubmitLoading.set(false);
        },
      });

    this.formSubmitted = false;
  }

  submitRegister() {
    this.formSubmitted = true;
    this.isSubmitLoading.set(true);

    if (this.registerForm.invalid) {
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'Form is invalid',
      });
      this.isSubmitLoading.set(false);
      return;
    }

    const registerData = this.registerForm.value;
    console.log(this.registerForm.value);
    this.authService
      .register(registerData.name, registerData.email, registerData.password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appService.setToastMessage({
            severity: 'success',
            summary: 'Success',
            detail: 'Verification email sent. Please verify your email to continue.',
          });
          this.router.navigate(['/auth/verify']);
        },
        error: (err: AuthError) => {
          this.isSubmitLoading.set(false);
          this.appService.setToastMessage({
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          });
        },
        complete: () => {
          this.isSubmitLoading.set(false);
        },
      });

    this.formSubmitted = false;
  }

  loginWithGoogle() {
    this.authService
      .loginGoogle()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: any) => {
          this.appService.setToastMessage({
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          });
        },
      });
  }

  isInvalid(form: FormGroup, controlName: string) {
    const control = form.get(controlName);
    return control?.invalid && (control.touched || this.formSubmitted);
  }

  togglePasswordVisibility(form: FormGroup) {
    if (form === this.loginForm) {
      this.isLoginPasswordVisible.set(!this.isLoginPasswordVisible());
    } else if (form === this.registerForm) {
      this.isRegisterPasswordVisible.set(!this.isRegisterPasswordVisible());
    }
  }

  toggleLogin() {
    this.isLogin.set(!this.isLogin());
    this.loginForm.reset();
    this.registerForm.reset();
    this.formSubmitted = false;
  }
}
