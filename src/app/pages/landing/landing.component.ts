import { Component, AfterViewInit, viewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit {
  router = inject(Router);

  videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');

  ngAfterViewInit(): void {
    const video = this.videoPlayer()?.nativeElement;
    if (video) {
      video.muted = true; // Still required for autoplay
      video.play().catch((err) => {
        console.warn('Autoplay was prevented by the browser:', err);
      });
    }
  }
}
