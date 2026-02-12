import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
// import {
//   Auth,
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut,
//   UserCredential,
//   onAuthStateChanged,
//   updateProfile,
//   signInWithRedirect,
//   getRedirectResult,
//   GoogleAuthProvider,
//   signInAnonymously,
// } from '@angular/fire/auth';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  feedbackForm!: FormGroup;
  categories = [
    { label: 'Suggestion', value: 'suggestion' },
    { label: 'Bug Report', value: 'bug' },
    { label: 'Recommendation', value: 'recommendation' },
    { label: 'General Feedback', value: 'general' },
  ];

  ngOnInit() {
    this.feedbackForm = this.fb.group({
      category: [null, Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  onSubmit() {
    if (this.feedbackForm.valid) {
      console.log('Feedback submitted:', this.feedbackForm.value);
      this.messageService.add({
        severity: 'success',
        summary: 'Feedback Received',
        detail: 'Thank you for your thoughts among the stars!',
      });
      this.feedbackForm.reset();
    }
  }
}
