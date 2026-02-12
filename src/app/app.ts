import { Component, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AppService } from './services/app.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BlurBackgroundComponent } from './shared/blur-background/blur-background.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, CommonModule, BlurBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private appService = inject(AppService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isLandingPage = signal(true);

  @HostListener('window:resize')
  onResize() {
    this.appService.setIsMobileView(window.innerWidth < 768);
  }

  ngOnInit(): void {
    this.appService.setIsMobileView(window.innerWidth < 768);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        this.isLandingPage.set(event.urlAfterRedirects === '/');
        this.appService.setActiveLink(event.urlAfterRedirects);
      });
  }
}
