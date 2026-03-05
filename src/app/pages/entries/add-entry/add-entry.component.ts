import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-add-entry',
  imports: [EntryComponent],
  templateUrl: './add-entry.component.html',
  styleUrl: './add-entry.component.css',
})
export class AddEntryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private appService = inject(AppService);

  values = signal({
    date: new Date(),
    title: '',
    content: '',
  });

  constructor() {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(new NavigationEnd(0, this.router.url, this.router.url)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        const activeUrl = event.urlAfterRedirects;
        if (activeUrl === '/entry/new') {
          this.appService.setIsEntryOpen(true);
        }
      });
  }
}
