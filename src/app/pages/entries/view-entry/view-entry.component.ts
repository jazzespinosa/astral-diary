import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DecryptedDocument } from 'app/models/entry.models';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { ErrorEntryComponent } from 'app/shared/components/error-entry/error-entry.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-view-entry',
  imports: [EntryComponent, ErrorEntryComponent, LoadingComponent],
  templateUrl: './view-entry.component.html',
  styleUrl: './view-entry.component.css',
})
export class ViewEntryComponent {
  private route = inject(ActivatedRoute);
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);

  document = signal<DecryptedDocument | null>(null);
  errorCode = signal<number | null>(null);

  params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const params = this.params();
      const sourceId = params.get('id');
      if (sourceId) {
        this.fetchData(sourceId);
      }
    });
  }

  private async fetchData(sourceId: string) {
    this.isLoading.set(true);
    try {
      const entry = await firstValueFrom(this.apiClientService.getEntry(sourceId));
      this.generalAppService.setIsEntryOpen(true);
      this.document.set(entry);
    } catch (error: any) {
      console.error(error);
      this.errorCode.set(error.status);
    } finally {
      this.isLoading.set(false);
    }
  }
}
