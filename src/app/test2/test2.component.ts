import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
} from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { CloudsComponent } from 'app/shared/models/clouds/clouds.component';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import * as THREE from 'three';
import { beforeRender } from 'angular-three';

@Component({
  selector: 'app-test2',
  imports: [NgtCanvas, NgtsPerspectiveCamera],
  templateUrl: './test2.component.html',
  styleUrl: './test2.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Test2Component {
  @ViewChild('camera', { static: true }) camera!: any;
  @ViewChild('follower', { static: true }) follower!: any;

  constructor() {
    beforeRender(() => {
      const cam = this.camera.camera as THREE.PerspectiveCamera;
      const obj = this.follower.instance as THREE.Mesh;

      obj.position.copy(cam.position);
      obj.translateZ(-2); // offset in front of camera
    });
  }
}
