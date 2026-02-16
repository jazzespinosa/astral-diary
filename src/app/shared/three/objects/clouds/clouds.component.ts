import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { beforeRender, NgtVector3 } from 'angular-three';
import * as THREE from 'three';
import { random } from 'maath';
import { NgtsCloud, NgtsCloudOptions } from 'angular-three-soba/staging';

@Component({
  selector: 'app-clouds',
  imports: [NgtsCloud],
  templateUrl: './clouds.component.html',
  styleUrl: './clouds.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudsComponent {
  // Inputs
  position = input.required<NgtVector3>();
  bounds = input.required<NgtVector3>();
  scale = input<NgtVector3>(1);
  hasLightning = input<boolean>(false);
  lightningIntensity = input<number>(0);
  options = input<Partial<NgtsCloudOptions>>();

  cloudOpts = computed(() => ({
    seed: this.seed,
    position: this.position(),
    scale: this.scale(),
    bounds: this.bounds(),
    opacity: 1,
    fade: 300,
    color: 'white',
    ...this.options(),
  }));

  // Internal
  private seed = Math.random() * 1000;

  // Light Refs
  private lightRef = viewChild<ElementRef<THREE.PointLight>>('light');

  // Flash generator
  private flash = new random.FlashGen({
    count: 10,
    minDuration: 40,
    maxDuration: 200,
  });

  constructor() {
    beforeRender(({ clock, delta }) => {
      if (!this.hasLightning() || this.lightningIntensity() <= 0) return;

      const ref = this.lightRef?.();
      if (!ref) return;

      const impulse = this.flash.update(clock.elapsedTime, delta) * this.lightningIntensity();
      const light = ref.nativeElement;

      // Move to a new location, when about to strike
      if (light.intensity < 0.1 && impulse > 0.1) {
        this.randomizeLightPosition(light);
      }
      // Apply flash intensity
      light.intensity = impulse;
    });
  }

  private randomizeLightPosition(light: THREE.PointLight) {
    // 1. Get the bounds (width, height, depth) passed to the component
    // NgtVector3 can be a number, array, or Vector3. We assume Array or Vector3 here.
    const b = this.bounds() as any;
    const xRange = b[0] ?? b.x ?? 1;
    const yRange = b[1] ?? b.y ?? 1;
    const zRange = b[2] ?? b.z ?? 1;

    // 2. Get the center position of the cloud
    const p = this.position() as any;
    const xPos = p[0] ?? p.x ?? 0;
    const yPos = p[1] ?? p.y ?? 0;
    const zPos = p[2] ?? p.z ?? 0;

    // 3. Set random position: Center + (Random spread * Bounds)
    // THREE.MathUtils.randFloatSpread(range) gives a number between -range/2 and range/2
    light.position.set(
      xPos + THREE.MathUtils.randFloatSpread(xRange),
      yPos + THREE.MathUtils.randFloatSpread(yRange),
      zPos + THREE.MathUtils.randFloatSpread(zRange),
    );
  }
}
