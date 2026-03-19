import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, viewChild, input } from '@angular/core';
import * as THREE from 'three';
import { beforeRender } from 'angular-three';
import { NgtsPointsBuffer } from 'angular-three-soba/performances';

@Component({
  selector: 'app-stars',
  imports: [NgtsPointsBuffer],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './stars.component.html',
  styleUrl: './stars.component.css',
})
export class StarsComponent implements OnInit {
  starCount = input.required<number>();
  minDistance = input.required<number>();
  maxDistanceMultiplier = input.required<number>();
  size = input.required<number>();

  positions!: Float32Array;
  colors!: Float32Array;
  sizes!: Float32Array;
  starTexture!: THREE.CanvasTexture;
  additiveBlending = THREE.AdditiveBlending;

  // Reference to the points mesh
  pointsRef = viewChild(NgtsPointsBuffer);

  // Animation speeds (adjustable)
  private rotationSpeedY = 0.0002;
  private rotationSpeedX = 0.0001;

  constructor() {
    // Animation loop - runs every frame
    beforeRender(({ delta }) => {
      const points = this.pointsRef()?.pointsRef()?.nativeElement;
      if (points) {
        points.rotation.y += this.rotationSpeedY * delta * 60;
        points.rotation.x += this.rotationSpeedX * delta * 60;
      }
    });
  }

  private starColors = [
    new THREE.Color(0xffffff), // White
    new THREE.Color(0xaaccff), // Blue-white
    new THREE.Color(0x88ccff), // Blue
    new THREE.Color(0xffffaa), // Yellow
    new THREE.Color(0xffddaa), // Orange
    new THREE.Color(0xffaaaa), // Red
    new THREE.Color(0xddaaff), // Purple
    new THREE.Color(0xaaffcc), // Cyan
  ];

  ngOnInit(): void {
    this.createStarTexture();
    this.createStars();
  }

  private createStarTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    this.starTexture = new THREE.CanvasTexture(canvas);
  }

  private createStars(): void {
    this.positions = new Float32Array(this.starCount() * 3);
    this.colors = new Float32Array(this.starCount() * 3);
    this.sizes = new Float32Array(this.starCount());

    for (let i = 0; i < this.starCount(); i++) {
      // Spherical distribution
      const radius = this.minDistance() + Math.random() * this.maxDistanceMultiplier();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random color from palette
      const color = this.starColors[Math.floor(Math.random() * this.starColors.length)];
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      // Size distribution: 20% small, 60% medium, 20% large
      const rand = Math.random();
      if (rand > 0.8) {
        this.sizes[i] = 10 + Math.random() * 1;
      } else if (rand > 0.2) {
        this.sizes[i] = 20 + Math.random() * 5;
      } else {
        this.sizes[i] = 30 + Math.random() * 5;
      }
    }
  }
}
