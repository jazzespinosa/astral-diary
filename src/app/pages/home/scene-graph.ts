import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  OnInit,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { beforeRender, NgtArgs } from 'angular-three';
import { Object3D, Object3DEventMap } from 'three';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { NgtsClouds, NgtsEnvironment, NgtsSpotLight } from 'angular-three-soba/staging';
import { gltfResource, textureResource } from 'angular-three-soba/loaders';
import {
  NgtpEffectComposer,
  NgtpBloom,
  NgtpVignette,
  NgtpOutline,
} from 'angular-three-postprocessing';
import * as THREE from 'three';
import { StarsComponent } from '../../shared/models/stars/stars.component';
import { CloudsComponent } from 'app/shared/models/clouds/clouds.component';
import { MainStarComponent } from 'app/shared/models/main-star/main-star.component';
import { AppService } from '../../services/app.service';

import blueNebulaPC from 'assets/blue-nebula-pc.hdr' with { loader: 'file' }; // for PC
import blueNebulaMobile from 'assets/blue-nebula-mobile.jpg' with { loader: 'file' }; // for Mobile
import milkyWayPC from 'assets/milky-way-pc.jpg' with { loader: 'file' }; // for PC
import milkyWayMobile from 'assets/milky-way-mobile.jpg' with { loader: 'file' }; // for Mobile
import moonAlbedo from 'assets/moon-albedo.jpg' with { loader: 'file' };
import moonBump from 'assets/moon-bump.jpg' with { loader: 'file' };
import moonEmissive from 'assets/moon-emissive.jpg' with { loader: 'file' };
import change from 'assets/change-updated.glb' with { loader: 'file' };
import asteroids from 'assets/asteroids.glb' with { loader: 'file' };
import comet from 'assets/comet.glb' with { loader: 'file' };

const Clouds = [
  // FRONT
  {
    position: [10, -3, 15],
    bounds: [7, 2, 7],
    scale: 1,
  },
  {
    position: [-10, -3, 15],
    bounds: [7, 2, 7],
    scale: 1,
  },
  {
    position: [0, -15, 15],
    bounds: [7, 3, 7],
    scale: 1,
  },
  // BACK
  {
    position: [10, -1, -15],
    bounds: [14, 4, 14],
    scale: 1,
  },
  {
    position: [-10, -1, -15],
    bounds: [14, 4, 14],
    scale: 1,
  },
  // SIDES
  {
    position: [30, 7, -10],
    bounds: [12, 4, 12],
    scale: 2,
  },
  {
    position: [-30, 0, -10],
    bounds: [12, 4, 12],
    scale: 2,
  },
  {
    position: [80, 30, -80],
    bounds: [10, 10, 10],
    scale: 4,
  },
  {
    position: [-80, 30, -80],
    bounds: [10, 10, 10],
    scale: 4,
  },
  // GROUND
  {
    position: [300, -300, 0],
    bounds: [30, 10, 30],
    scale: 10,
  },
  {
    position: [-300, -300, 0],
    bounds: [30, 10, 30],
    scale: 10,
  },
];

@Component({
  selector: 'app-scene-graph',
  templateUrl: './scene-graph.html',
  styleUrls: ['./scene-graph.css'],
  imports: [
    NgtsOrbitControls,
    NgtsPerspectiveCamera,
    NgtsEnvironment,
    NgtArgs,
    StarsComponent,
    NgtpEffectComposer,
    NgtpBloom,
    NgtpVignette,
    NgtpOutline,
    CommonModule,
    NgtsClouds,
    NgtsSpotLight,
    CloudsComponent,
    MainStarComponent,
    // NgtsAdaptiveDpr,
    // NgtsAdaptiveEvents,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneGraph implements OnInit {
  protected appService = inject(AppService);

  clouds = signal<any>(Clouds);
  isMobileView = signal(window.innerWidth < 768);
  cloudOptions = computed(() =>
    this.isMobileView()
      ? { smallestVolume: 1.5, segments: 8, limit: 20, speed: 0.03 }
      : { smallestVolume: 1.5, segments: 20, limit: 100, speed: 0.1 },
  );
  cloudsLimits = computed(() => (this.isMobileView() ? 100 : 400));
  hasLightning = computed(() => !this.isMobileView());
  lightningIntensity = computed(() => (this.isMobileView() ? 0 : 50));
  starSizeInner = computed(() => (this.isMobileView() ? 30 : 15));
  starSizeOuter = computed(() => (this.isMobileView() ? 60 : 30));

  getMilkyWay() {
    return this.isMobileView() ? milkyWayMobile : milkyWayPC;
  }

  getBlueNebula() {
    return this.isMobileView() ? blueNebulaMobile : blueNebulaPC;
  }

  // GLTF Resources
  readonly change = gltfResource(() => change);
  readonly asteroids = gltfResource(() => asteroids);
  readonly comet = gltfResource(() => comet);

  // Texture Resources
  moonTexture = textureResource(() => ({
    map: moonAlbedo,
    bumpMap: moonBump,
    emissiveMap: moonEmissive,
  }));

  // Reference to the elements refs
  moonRef = viewChild<ElementRef<THREE.Mesh>>('moonRef');
  asteroidsRef = viewChild<ElementRef<THREE.Points>>('asteroidsRef');
  cometRef = viewChild<ElementRef<THREE.Points>>('cometRef');
  cometTailRef = viewChild<ElementRef<Object3D<Object3DEventMap>>>('cometTailRef');

  // Computed signal for outline selection
  moonSelectionCS = computed(() => {
    const moon = this.moonRef()?.nativeElement;
    return moon ? [moon] : undefined;
  });

  // Computed signal for comet tail spotlight
  cometTailCS = computed(() => {
    const cometTail = this.cometTailRef()?.nativeElement;
    return cometTail ? cometTail : undefined;
  });

  // Animation speeds (adjustable)
  private rotationSpeedYMoon = 0.0005;
  private rotationSpeedXMoon = -0.0005;
  private rotationSpeedYAsteroids = -0.00005;
  private rotationSpeedXAsteroids = 0.00005;
  private rotationSpeedCometX = -0.00002;
  private rotationSpeedCometY = 0.00005;

  // private rotationSpeedCometX = 0;
  // private rotationSpeedCometY = 0;

  constructor() {
    beforeRender(({ delta, clock }) => {
      // Rotate import objects
      const moonPoints = this.moonRef()?.nativeElement;
      if (moonPoints) {
        moonPoints.rotation.y += this.rotationSpeedYMoon * delta * 60;
        moonPoints.rotation.x += this.rotationSpeedXMoon * delta * 60;
      }
      const asteroids = this.asteroidsRef()?.nativeElement;
      if (asteroids) {
        asteroids.rotation.y += this.rotationSpeedYAsteroids * delta * 60;
        asteroids.rotation.x += this.rotationSpeedXAsteroids * delta * 60;
      }
      const comet = this.cometRef()?.nativeElement;
      if (comet) {
        comet.rotation.x += this.rotationSpeedCometX * delta * 60;
        comet.rotation.y += this.rotationSpeedCometY * delta * 60;
      }

      // position + orientation each frame
      const t = (clock.getElapsedTime() * this.speed) % 1;

      const obj = this.traveler();
      const pos = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();

      obj.position.copy(pos);

      // orient the object to face along the path tangent
      obj.up.set(0, 1, 0);
      obj.lookAt(pos.clone().add(tangent));
    });

    effect(() => {
      const gltf = this.travelerRes.value();
      if (!gltf) return;
      gltf.scene.rotateY(Math.PI / -2);

      const root = this.traveler();
      root.clear();

      const model = gltf.scene.clone(true);
      root.add(model);
    });
  }

  ngOnInit(): void {}

  moonClick() {
    this.appService.setIsEntryOpen(true);
  }

  // Custom path
  private readonly curve = new THREE.CatmullRomCurve3(
    [
      // new THREE.Vector3(-40, 0, 0),
      // new THREE.Vector3(-20, 20, 10),
      // new THREE.Vector3(0, 0, 30),
      // new THREE.Vector3(20, 10, 10),
      // new THREE.Vector3(40, 0, -10),
      // new THREE.Vector3(0, -10, -30),

      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, 0, 12),
      new THREE.Vector3(-13, 5, 0),
      new THREE.Vector3(0, 5, -10),
      new THREE.Vector3(13, 5, 0),
      new THREE.Vector3(0, 3, 12),
      new THREE.Vector3(-12, 2, 0),
      new THREE.Vector3(0, 0, -12),
      new THREE.Vector3(11, -4, 0),
      new THREE.Vector3(2, -7, 9),
      new THREE.Vector3(-10, -4, 1),
      new THREE.Vector3(2, -3, -10),
      new THREE.Vector3(9, -3, -1),
      new THREE.Vector3(3, -3, 11),
      new THREE.Vector3(-12, -1, 5),
      new THREE.Vector3(-6, 2, -8),
      new THREE.Vector3(9, 7, -3),
      new THREE.Vector3(1, 8, 5),
      new THREE.Vector3(-8, 2, -1),
      new THREE.Vector3(2, 1, -11),
    ],
    true, // closed loop
    'catmullrom',
    0.5,
  );

  // Custom object in TS and render it with ngt-primitive
  readonly travelerRes = gltfResource(() => change);
  readonly traveler = signal<THREE.Object3D>(new THREE.Group());

  // Path as a line
  readonly pathLine = signal<THREE.Object3D>(this.createPathLine());

  // Speed controls
  readonly speed = 0.008; // "loops per second" (roughly)

  private createPathLine(): THREE.Object3D {
    const points = this.curve.getPoints(300);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      // color: 'white',
      opacity: 0,
      transparent: true,
    });

    // LineLoop makes it closed; use THREE.Line if your curve is not closed
    const line = new THREE.LineLoop(geometry, material);
    line.visible = false;
    return line;
  }
}
