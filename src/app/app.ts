import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NavbarComponent } from './shared/layout/navbar/navbar.component';
import { GeneralAppService } from './services/general-app.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BlurBackgroundComponent } from './shared/components/blur-background/blur-background.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    RouterOutlet,
    CommonModule,
    BlurBackgroundComponent,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
})
export class App implements OnInit {
  private generalAppService = inject(GeneralAppService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isLandingPage = signal(true);

  @HostListener('window:resize')
  onResize() {
    this.generalAppService.setIsMobileView(window.innerWidth < 768);
  }

  ngOnInit(): void {
    this.generalAppService.setIsMobileView(window.innerWidth < 768);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        this.isLandingPage.set(event.urlAfterRedirects === '/');
        this.generalAppService.setActiveLink(event.urlAfterRedirects);
      });
  }
}
