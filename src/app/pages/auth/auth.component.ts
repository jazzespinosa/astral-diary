import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ErrorMessageComponent } from 'app/shared/components/error-message/error-message.component';

@Component({
  selector: 'app-auth',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    ErrorMessageComponent,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private formBuilder = inject(FormBuilder);

  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isLogin = signal(true); //form toggle
  isLoginPasswordVisible = signal(false);
  isRegisterPasswordVisible = signal(false);
  formSubmitted = false;

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmitLogin() {
    this.formSubmitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    console.log(this.loginForm.value);
    this.formSubmitted = false;
  }

  onSubmitRegister() {
    this.formSubmitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    console.log(this.registerForm.value);
    this.formSubmitted = false;
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
