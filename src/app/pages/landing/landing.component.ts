import { Component, AfterViewInit, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit {
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
