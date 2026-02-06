import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppService } from './services/app.service';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { BlurBackgroundComponent } from './shared/blur-background/blur-background.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, CommonModule, BlurBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private appService = inject(AppService);

  @HostListener('window:resize')
  onResize() {
    this.appService.setIsMobileView(window.innerWidth < 768);
  }

  ngOnInit(): void {
    this.appService.setIsMobileView(window.innerWidth < 768);
  }
}
