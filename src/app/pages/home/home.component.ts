import { Component, inject, signal } from '@angular/core';
import { NgtCanvas, provideNgtRenderer } from 'angular-three/dom';
import { SceneGraph } from './scene-graph/scene-graph';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-home',
  imports: [NgtCanvas, SceneGraph, EntryComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected appService = inject(AppService);

  entryValues = signal({
    entryDate: new Date(),
    entryTitle: '',
    entryContent: '',
  });
}
