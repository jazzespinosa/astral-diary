import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import * as THREE from 'three';

// 8-point “compass” star (4 long + 4 short spikes)
function createStarShape(
  spikes = 8,
  outerMajor = 1.2, // N/E/S/W
  outerMinor = 0.85, // diagonals
  innerRadius = 0.35,
): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / spikes;
  const start = -Math.PI / 2; // point up

  for (let i = 0; i < spikes; i++) {
    const aOuter = start + i * step;
    const rOuter = i % 2 === 0 ? outerMajor : outerMinor;

    const xOuter = Math.cos(aOuter) * rOuter;
    const yOuter = Math.sin(aOuter) * rOuter;

    if (i === 0) shape.moveTo(xOuter, yOuter);
    else shape.lineTo(xOuter, yOuter);

    const aInner = aOuter + step / 2;
    shape.lineTo(Math.cos(aInner) * innerRadius, Math.sin(aInner) * innerRadius);
  }

  shape.closePath();
  return shape;
}

@Component({
  selector: 'app-test',
  imports: [NgtCanvas],
  templateUrl: './test.component.html',
  styleUrl: './test.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestComponent {
  readonly starShape = createStarShape(8, 1.2, 0.85, 0.35);
}
