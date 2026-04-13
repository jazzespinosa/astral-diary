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
import { StarsComponent } from 'app/pages/home/three/objects/stars/stars.component';
import { CloudsComponent } from 'app/pages/home/three/objects/clouds/clouds.component';
import { MainStarComponent } from 'app/pages/home/three/objects/main-star/main-star.component';

import blueNebulaPC from 'assets/blue-nebula-pc.hdr' with { loader: 'file' }; // for PC
import blueNebulaMobile from 'assets/blue-nebula-mobile.jpg' with { loader: 'file' }; // for Mobile
import milkyWayPC from 'assets/milky-way-pc.jpg' with { loader: 'file' }; // for PC
import milkyWayMobile from 'assets/milky-way-mobile.jpg' with { loader: 'file' }; // for Mobile
import moonAlbedo from 'assets/moon-albedo.jpg' with { loader: 'file' };
import moonBump from 'assets/moon-bump.jpg' with { loader: 'file' };
import moonEmissive from 'assets/moon-emissive.jpg' with { loader: 'file' };
import asteroids from 'assets/asteroids.glb' with { loader: 'file' };
import comet from 'assets/comet.glb' with { loader: 'file' };
import { EntryService } from 'app/services/entry.service';
import { GeneralAppService } from 'app/services/general-app.service';

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
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneGraph {
  protected generalAppService = inject(GeneralAppService);
  private entryService = inject(EntryService);

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
  readonly asteroids = gltfResource(() => asteroids);
  readonly comet = gltfResource(() => comet);

  // Texture Resources
  moonTexture = textureResource(() => ({
    map: moonAlbedo,
    bumpMap: moonBump,
    emissiveMap: moonEmissive,
  }));

  moonRef = viewChild<ElementRef<THREE.Mesh>>('moonRef');
  asteroidsRef = viewChild<ElementRef<THREE.Points>>('asteroidsRef');
  cometRef = viewChild<ElementRef<THREE.Points>>('cometRef');
  cometTailRef = viewChild<ElementRef<Object3D<Object3DEventMap>>>('cometTailRef');

  moonSelectionCS = computed(() => {
    const moon = this.moonRef()?.nativeElement;
    return moon ? [moon] : undefined;
  });

  cometTailCS = computed(() => {
    const cometTail = this.cometTailRef()?.nativeElement;
    return cometTail ? cometTail : undefined;
  });

  private rotationSpeedYMoon = 0.0005;
  private rotationSpeedXMoon = -0.0005;
  private rotationSpeedYAsteroids = -0.00005;
  private rotationSpeedXAsteroids = 0.00005;
  private rotationSpeedCometX = -0.00002;
  private rotationSpeedCometY = 0.00005;

  constructor() {
    beforeRender(({ delta, clock }) => {
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
    });
  }

  moonClick() {
    this.entryService.triggerHomeAccess();
  }
}
