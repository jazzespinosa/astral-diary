import { Component, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-error-input',
  imports: [MessageModule],
  templateUrl: './error-input.component.html',
  styleUrl: './error-input.component.css',
})
export class ErrorInputComponent {
  message = input.required();
}
