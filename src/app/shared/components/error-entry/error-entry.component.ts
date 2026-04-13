import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-error-entry',
  imports: [],
  templateUrl: './error-entry.component.html',
  styleUrl: './error-entry.component.css',
})
export class ErrorEntryComponent {
  errorCode = input.required<number | null>();

  errorValues = computed(() => {
    const code = this.errorCode();

    if (code === null)
      return {
        code: '',
        title: 'Error',
        message: 'Unexpected error occurred. Please try again later.',
      };

    if (code === 0) {
      return {
        code: '',
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please try again later.',
      };
    } else if (code >= 500) {
      return {
        code: `${this.errorCode()}`,
        title: 'Server Error',
        message: 'Error occurred on the server. Please try again later.',
      };
    } else if (code >= 400) {
      return {
        code: `${this.errorCode()}`,
        title: 'Client Error',
        message: 'The entry or draft you are looking for does not exist or has been deleted.',
      };
    }

    return {
      code: '',
      title: 'Error',
      message: 'Unexpected error occurred. Please try again later.',
    };
  });
}
