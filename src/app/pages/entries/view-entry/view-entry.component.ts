import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { AppService } from 'app/services/app.service';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { filter, startWith } from 'rxjs';

@Component({
  selector: 'app-view-entry',
  imports: [EntryComponent],
  templateUrl: './view-entry.component.html',
  styleUrl: './view-entry.component.css',
})
export class ViewEntryComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private appService = inject(AppService);

  values = signal({
    date: new Date(),
    title: '',
    content: '',
  });

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(new NavigationEnd(0, this.router.url, this.router.url)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        const activeUrl = event.urlAfterRedirects;
        if (activeUrl.startsWith('/entry/view/')) {
          this.appService.setIsEntryOpen(true);
        }
      });
  }
}
