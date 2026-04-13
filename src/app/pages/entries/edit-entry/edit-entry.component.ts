import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DecryptedDocument, EntryAccess } from 'app/models/entry.models';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { ErrorEntryComponent } from 'app/shared/components/error-entry/error-entry.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';
import { EntryService } from 'app/services/entry.service';
import { firstValueFrom } from 'rxjs';
import { CanComponentDeactivate } from 'app/guards/pending-changes.guard';

@Component({
  selector: 'app-edit-entry',
  imports: [EntryComponent, ErrorEntryComponent, LoadingComponent],
  templateUrl: './edit-entry.component.html',
  styleUrl: './edit-entry.component.css',
})
export class EditEntryComponent implements CanComponentDeactivate {
  private route = inject(ActivatedRoute);
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);
  private entryService = inject(EntryService);

  document = signal<DecryptedDocument | null>(null);
  errorCode = signal<number | null>(null);

  params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  isLoading = signal<boolean>(false);
  access = signal<EntryAccess>('edit-entry');

  entryForm = viewChild(EntryComponent);

  constructor() {
    effect(() => {
      const sourceId = this.params().get('id');
      if (sourceId) {
        this.fetchData(sourceId);
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.entryForm() ? this.entryForm()!.hasUnsavedChanges() : false;
  }

  isSubmitting(): boolean {
    return this.entryForm() ? this.entryForm()!.isSubmitting() : false;
  }

  private async fetchData(sourceId: string) {
    this.isLoading.set(true);
    const type = this.entryService.getIdType(sourceId);

    try {
      if (type === 'draft') {
        this.access.set('edit-draft');
        const draft = await firstValueFrom(this.apiClientService.getDraft(sourceId));
        this.generalAppService.setIsEntryOpen(true);
        this.document.set(draft);
      } else if (type === 'entry') {
        this.access.set('edit-entry');
        const entry = await firstValueFrom(this.apiClientService.getEntry(sourceId));
        this.generalAppService.setIsEntryOpen(true);
        this.document.set(entry);
      } else {
        this.errorCode.set(404);
      }
    } catch (error: any) {
      console.error(error);
      this.errorCode.set(error.status);
    } finally {
      this.isLoading.set(false);
    }
  }
}
