import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GeneralAppService } from 'app/services/general-app.service';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'app/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, MenuModule, ToggleSwitchModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent {
  protected appService = inject(GeneralAppService);
  protected authService = inject(AuthService);
  private router = inject(Router);

  isScrolled = false;

  checked = computed(() => this.appService.isBackgroundMilkyWay());

  private PopUpMenuNotLoggedIn: MenuItem[] = [
    {
      separator: true,
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Login / Register',
          icon: 'fa-solid fa-arrow-right-to-bracket',
          command: () => this.router.navigate(['/auth']),
        },
      ],
    },
    {
      separator: true,
    },
  ];

  private PopUpMenuLoggedIn: MenuItem[] = [
    {
      separator: true,
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Profile',
          icon: 'fa-solid fa-user',
          command: () => this.router.navigate(['/account']),
        },
        {
          label: 'Logout',
          icon: 'fa-solid fa-arrow-right-from-bracket',
          iconClass: 'text-danger',
          styleClass: 'logout',
          command: () => this.logout(),
        },
      ],
    },
    {
      separator: true,
    },
  ];

  items = computed(() => {
    if (this.authService.activeUser$()) {
      const name = this.authService.activeUser$()?.name;
      this.PopUpMenuLoggedIn[1].items![0].label = name;
      return this.PopUpMenuLoggedIn;
    } else {
      return this.PopUpMenuNotLoggedIn;
    }
  });

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  private logout() {
    this.authService.signOutIfNeeded();
    this.authService.setActiveUser(null);
    this.appService.setToastMessage({
      severity: 'success',
      summary: 'Success',
      detail: 'Logged out successfully',
    });
    this.router.navigate(['/auth']);
  }
}
