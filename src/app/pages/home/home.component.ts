import { Component, inject, OnInit, signal, Signal } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { SceneGraph } from './scene-graph';
import { EntryComponent } from 'app/shared/entry/entry.component';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-home',
  imports: [NgtCanvas, SceneGraph, EntryComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected appService = inject(AppService);
}
