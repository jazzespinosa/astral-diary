import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, viewChildren } from '@angular/core';
import { beforeRender, NgtArgs } from 'angular-three';
import { NgtsBillboard } from 'angular-three-soba/abstractions';
import { textureResource } from 'angular-three-soba/loaders';
import * as THREE from 'three';

import alphaMap from 'assets/star-alpha-map.png' with { loader: 'file' };
import starMapPurple from 'assets/star-map-purple.jpg' with { loader: 'file' };
import starMapBlue from 'assets/star-map-blue.png' with { loader: 'file' };
import starMapRed from 'assets/star-map-red.jpg' with { loader: 'file' };
import starMapGreen from 'assets/star-map-green.png' with { loader: 'file' };
import starMapYellow from 'assets/star-map-yellow.png' with { loader: 'file' };
import starMapBlueGreen from 'assets/star-map-bluegreen.jpg' with { loader: 'file' };
import { EntryService } from 'app/services/entry.service';

function createStarShape(
  spikes = 8,
  outerMajor = 0.48,
  // outerMinor = 0.34,
  // innerRadius = 0.14,
  outerMinor = 0.3,
  innerRadius = 0.07,
  cx = 0.5,
  cy = 0.5,
): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / spikes;
  const start = -Math.PI / 2;

  for (let i = 0; i < spikes; i++) {
    const aOuter = start + i * step;
    const rOuter = i % 2 === 0 ? outerMajor : outerMinor;

    const xOuter = cx + Math.cos(aOuter) * rOuter;
    const yOuter = cy + Math.sin(aOuter) * rOuter;

    if (i === 0) shape.moveTo(xOuter, yOuter);
    else shape.lineTo(xOuter, yOuter);

    const aInner = aOuter + step / 2;
    shape.lineTo(cx + Math.cos(aInner) * innerRadius, cy + Math.sin(aInner) * innerRadius);
  }

  shape.closePath();
  return shape;
}

@Component({
  selector: 'app-main-star',
  imports: [NgtArgs, NgtsBillboard],
  templateUrl: './main-star.component.html',
  styleUrl: './main-star.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainStarComponent {
  private entryService = inject(EntryService);

  readonly starShape = createStarShape();
  private scaleAmp = 0.2;
  private minOpacity = 0.2;
  private maxOpacity = 1.0;

  private starGroups = viewChildren<ElementRef<THREE.Group>>('starGroup');
  private starMats = viewChildren<ElementRef<THREE.MeshStandardMaterial>>('starMat');

  instances: {
    position: [number, number, number];
    map: any;
    scale: number;
    phase: number;
    speed: number;
  }[] = [];

  starMaps = [
    starMapPurple,
    starMapBlue,
    starMapRed,
    starMapYellow,
    starMapGreen,
    starMapBlueGreen,
  ];

  constructor() {
    let starMaps: any[] = [];
    for (let index = 0; index < this.starMaps.length; index++) {
      let map = textureResource(() => ({
        map: this.starMaps[index],
        alphaMap: alphaMap,
      }));
      starMaps.push(map);
    }

    // Create 200 instances in a spherical distribution
    for (let i = 0; i < 200; i++) {
      const radius = 400 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const scale = 8 + Math.random() * 7;

      this.instances.push({
        position: [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
        ],
        map: starMaps[Math.floor(Math.random() * starMaps.length)],
        scale: scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      });
    }

    beforeRender(({ clock }) => {
      const t = clock.getElapsedTime();
      const groups = this.starGroups();
      const mats = this.starMats();

      for (let i = 0; i < groups.length; i++) {
        const inst = this.instances[i];
        if (!inst) continue;

        const pulse01 = 0.5 + 0.5 * Math.sin(t * inst.speed + inst.phase);
        const scale = 1 + this.scaleAmp * pulse01;
        groups[i]?.nativeElement?.scale.setScalar(inst.scale * scale);

        const mat = mats[i]?.nativeElement;
        if (mat) {
          mat.opacity = this.minOpacity + (this.maxOpacity - this.minOpacity) * pulse01;
        }
      }
    });
  }

  mainStarClicked() {
    this.entryService.triggerStarClick();
  }
}
