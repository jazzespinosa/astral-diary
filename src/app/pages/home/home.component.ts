import { Component, inject, signal } from '@angular/core';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { GeneralAppService } from 'app/services/general-app.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [EntryComponent, RouterOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected appService = inject(GeneralAppService);

  values = signal({
    date: new Date(),
    title: '',
    content: '',
    mood: null,
  });
}
