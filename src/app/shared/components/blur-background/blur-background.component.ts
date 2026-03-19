import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { GeneralAppService } from 'app/services/general-app.service';

@Component({
  selector: 'app-blur-background',
  imports: [],
  templateUrl: './blur-background.component.html',
  styleUrl: './blur-background.component.css',
})
export class BlurBackgroundComponent implements AfterViewInit {
  protected appService = inject(GeneralAppService);

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
