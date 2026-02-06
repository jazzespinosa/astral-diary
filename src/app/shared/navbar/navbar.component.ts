import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AppService } from 'app/services/app.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  protected appService = inject(AppService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  activeLink: string = 'home';
  isScrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        this.activeLink = event.urlAfterRedirects;
      });
  }

  toggleBackground() {
    this.appService.setIsBackgroundMilkyWay(!this.appService.isBackgroundMilkyWay());
    console.log(this.appService.isBackgroundMilkyWay());
  }
}
