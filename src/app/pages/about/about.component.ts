import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule, TextareaModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent implements OnInit {
  private appService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);
  private formBuilder = inject(FormBuilder);

  feedbackForm!: FormGroup;
  categories = [
    { label: 'Suggestion', value: 'suggestion' },
    { label: 'Bug Report', value: 'bug' },
    { label: 'Recommendation', value: 'recommendation' },
    { label: 'General Feedback', value: 'general' },
  ];

  ngOnInit() {
    this.feedbackForm = this.formBuilder.group({
      category: [null, Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  async onSubmit() {
    if (this.feedbackForm.valid) {
      const response = await firstValueFrom(
        this.apiClientService.submitFeedback(this.feedbackForm.value),
      );
      this.appService.setCustomToastMessage({
        severity: 'success',
        summary: 'Feedback Received',
        detail: 'Thank you for sharing your thoughts!',
      });
      this.feedbackForm.reset();
    }
  }
}
