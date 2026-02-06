import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-drafts',
  imports: [ButtonModule, CardModule],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.css',
})
export class DraftsComponent {}
