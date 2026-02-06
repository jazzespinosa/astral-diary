import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  OnInit,
  inject,
  computed,
  input,
  signal,
} from '@angular/core';
import { Observable } from 'rxjs';
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
import { NgtsEdges, NgtsHelper } from 'angular-three-soba/abstractions';
import { NgtsAdaptiveDpr, NgtsAdaptiveEvents, NgtsBVH } from 'angular-three-soba/performances';
import * as THREE from 'three';
import { StarsComponent } from '../../shared/models/stars/stars.component';
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
import { CloudsComponent } from 'app/shared/models/clouds/clouds.component';

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
    NgtsEdges,
    NgtsSpotLight,
    CloudsComponent,
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
  cloudsSystemOptions = computed(() => ({ limit: this.isMobileView() ? 100 : 400 }));
  hasLightning = computed(() => !this.isMobileView());
  lightningIntensity = computed(() => (this.isMobileView() ? 0 : 50));
  starSizeInner = computed(() => (this.isMobileView() ? 50 : 20));
  starSizeOuter = computed(() => (this.isMobileView() ? 100 : 40));

  getMilkyWay() {
    return this.isMobileView() ? milkyWayMobile : milkyWayPC;
  }

  getBlueNebula() {
    return this.isMobileView() ? blueNebulaMobile : blueNebulaPC;
  }

  // GLTF Resources
  change = gltfResource(() => change);
  asteroids = gltfResource(() => asteroids);
  comet = gltfResource(() => comet);

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
    beforeRender(({ delta }) => {
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

  ngOnInit(): void {}

  moonClick(event: any) {
    this.appService.setIsEntryOpen(true);
  }

  readonly PointLightHelper = THREE.PointLightHelper;
  readonly HemisphereLightHelper = THREE.HemisphereLightHelper;
}
