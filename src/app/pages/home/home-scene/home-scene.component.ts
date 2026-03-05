import { Component, inject } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { SceneGraph } from './scene-graph';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-home-scene',
  imports: [NgtCanvas, SceneGraph],
  templateUrl: './home-scene.component.html',
  styleUrl: './home-scene.component.css',
})
export class HomeSceneComponent {
  appService = inject(AppService);
}
