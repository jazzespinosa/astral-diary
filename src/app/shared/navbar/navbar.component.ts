import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppService } from 'app/services/app.service';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

const PopUpMenu = [
  {
    label: 'Account',
    items: [
      {
        label: 'Continue with Google',
        icon: 'fa-brands fa-google',
        labelStyle: { width: 'max-content' },
      },
      {
        label: 'Logout',
        icon: 'fa-solid fa-arrow-right-from-bracket',
        iconClass: 'text-danger',
        labelClass: 'text-danger',
      },
    ],
  },
];

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, ButtonModule, MenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  protected appService = inject(AppService);

  isScrolled = false;

  items: MenuItem[] | undefined;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  ngOnInit(): void {
    this.items = PopUpMenu;
  }

  toggleBackground() {
    this.appService.setIsBackgroundMilkyWay(!this.appService.isBackgroundMilkyWay());
    console.log(this.appService.isBackgroundMilkyWay());
  }
}
