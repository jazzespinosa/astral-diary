import { Component, inject, signal } from '@angular/core';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { AppService } from 'app/services/app.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [EntryComponent, RouterOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected appService = inject(AppService);

  values = signal({
    date: new Date(),
    title: '',
    content: '',
  });
}
