import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ErrorInputComponent } from 'app/shared/components/error-input/error-input.component';
import { AuthService } from 'app/services/auth.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GeneralAppService } from 'app/services/general-app.service';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, CommonModule, InputTextModule, ButtonModule, ErrorInputComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private appService = inject(GeneralAppService);
  private authService = inject(AuthService);
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

  async submitLogin() {
    this.formSubmitted = true;
    this.isSubmitLoading.set(true);

    if (this.loginForm.invalid) {
      this.appService.setErrorToast('Form is invalid');
      this.isSubmitLoading.set(false);
      return;
    }

    try {
      const loginData = this.loginForm.value;
      await firstValueFrom(this.authService.login(loginData.email, loginData.password));
      this.appService.setSuccessToast('Login successful');
      this.router.navigate(['/home']);
    } catch (err: any) {
      this.appService.setErrorToast(err.message || 'Login failed');
    } finally {
      this.isSubmitLoading.set(false);
      this.formSubmitted = false;
    }
  }

  async submitRegister() {
    this.formSubmitted = true;
    this.isSubmitLoading.set(true);

    if (this.registerForm.invalid) {
      this.appService.setErrorToast('Form is invalid');
      this.isSubmitLoading.set(false);
      return;
    }

    try {
      const registerData = this.registerForm.value;
      await firstValueFrom(
        this.authService.register(registerData.name, registerData.email, registerData.password),
      );
      this.appService.setSuccessToast(
        'Verification email sent. Please verify your email to continue.',
      );
      this.router.navigate(['/auth/verify']);
    } catch (err: any) {
      this.appService.setErrorToast(err.message || 'Registration failed');
    } finally {
      this.isSubmitLoading.set(false);
      this.formSubmitted = false;
    }
  }

  async loginWithGoogle() {
    try {
      await firstValueFrom(this.authService.loginGoogle());
    } catch (err: any) {
      this.appService.setErrorToast(err.message || 'Google login failed');
    }
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
