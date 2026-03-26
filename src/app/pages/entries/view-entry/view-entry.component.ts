import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AttachmentObjResponse, EntryValues } from 'app/models/entry.models';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { filter, startWith } from 'rxjs';
import { NotFoundComponent } from 'app/shared/components/not-found/not-found.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';

@Component({
  selector: 'app-view-entry',
  imports: [EntryComponent, NotFoundComponent, LoadingComponent],
  templateUrl: './view-entry.component.html',
  styleUrl: './view-entry.component.css',
})
export class ViewEntryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);

  values = signal(new EntryValues());
  sourceId = signal<string | null>(null);
  attachments = signal<AttachmentObjResponse[]>([]);

  params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const params = this.params();
      const sourceId = params.get('id');
      if (sourceId) {
        this.isLoading.set(true);
        this.apiClientService
          .getEntry(sourceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (entry) => {
              this.generalAppService.setIsEntryOpen(true);
              this.values.set({
                date: new Date(entry.date),
                title: entry.title,
                content: entry.content,
                mood: entry.mood,
              });
              this.attachments.set(entry.attachments ?? []);
              this.sourceId.set(sourceId);
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error(error);
              this.isLoading.set(false);
            },
          });
      }
    });
  }

  ngOnInit(): void {}
}
