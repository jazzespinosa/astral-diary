import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AttachmentObjResponse, EntryAccess, EntryValues } from 'app/models/entry.models';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { NotFoundComponent } from 'app/shared/components/not-found/not-found.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';

@Component({
  selector: 'app-edit-entry',
  imports: [EntryComponent, NotFoundComponent, LoadingComponent],
  templateUrl: './edit-entry.component.html',
  styleUrl: './edit-entry.component.css',
})
export class EditEntryComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);

  inputValues = input(new EntryValues());
  values = signal(new EntryValues());

  sourceId = signal<string | null>(null);
  attachments = signal<AttachmentObjResponse[]>([]);

  params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  isLoading = signal<boolean>(false);
  access = signal<EntryAccess>('edit-entry');

  constructor() {
    effect(() => {
      const params = this.params();
      const sourceId = params.get('id');

      this.isLoading.set(true);

      if (sourceId?.startsWith('draft-')) {
        this.access.set('edit-draft');
        this.apiClientService
          .getDraft(sourceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (draft) => {
              this.generalAppService.setIsEntryOpen(true);
              this.values.set({
                date: new Date(draft.date),
                title: draft.title ?? '',
                content: draft.content ?? '',
                mood: draft.mood,
              });

              this.attachments.set(draft.attachments ?? []);
              this.sourceId.set(sourceId);
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error(error);
              this.isLoading.set(false);
            },
          });
      } else if (sourceId?.startsWith('entry-')) {
        this.access.set('edit-entry');
        this.apiClientService.getEntry(sourceId).subscribe({
          next: (entry) => {
            this.generalAppService.setIsEntryOpen(true);
            this.values.set({
              date: new Date(entry.date),
              title: entry.title ?? '',
              content: entry.content ?? '',
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
}
