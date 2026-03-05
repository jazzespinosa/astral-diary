import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GetDraftsResponse } from 'app/models/entry.models';
import { EntryService } from 'app/services/entry.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-drafts',
  imports: [ButtonModule, CardModule],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.css',
})
export class DraftsComponent implements OnInit {
  private entryService = inject(EntryService);
  private destroyRef = inject(DestroyRef);

  drafts = signal<GetDraftsResponse[]>([]);

  ngOnInit(): void {
    this.entryService
      .getDrafts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((draftsResponse) => {
        this.drafts.set(draftsResponse);
      });
  }
}
