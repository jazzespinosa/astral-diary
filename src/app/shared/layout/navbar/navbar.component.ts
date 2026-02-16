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
import { AppService } from 'app/services/app.service';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, MenuModule, ToggleSwitchModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent implements OnInit {
  protected appService = inject(AppService);
  private router = inject(Router);

  isScrolled = false;

  checked = computed(() => this.appService.isBackgroundMilkyWay());

  private PopUpMenuNotLoggedIn = [
    {
      separator: true,
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Login or Register',
          icon: 'fa-solid fa-arrow-right-to-bracket',
          command: () => {
            this.router.navigate(['/auth']);
          },
        },
      ],
    },
    {
      separator: true,
    },
  ];

  private PopUpMenuLoggedIn = [
    {
      separator: true,
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Profile',
          icon: 'fa-solid fa-user',
          command: () => {
            this.router.navigate(['/account']);
          },
        },
        {
          label: 'Logout',
          icon: 'fa-solid fa-arrow-right-from-bracket',
          iconClass: 'text-danger',
          styleClass: 'logout',
        },
      ],
    },
    {
      separator: true,
    },
  ];

  items: MenuItem[] | undefined;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  ngOnInit(): void {
    this.items = this.PopUpMenuLoggedIn;
  }

  toggleBackground() {
    this.appService.setIsBackgroundMilkyWay(!this.appService.isBackgroundMilkyWay());
    console.log(this.appService.isBackgroundMilkyWay());
  }
}
