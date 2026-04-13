import { Component, computed, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { DecryptedDocument } from 'app/models/entry.models';
import { ApiClientService } from 'app/services/api-client.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CardComponent } from 'app/shared/components/card/card.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-drafts',
  imports: [ButtonModule, CardModule, CardComponent, LoadingComponent],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DraftsComponent implements OnInit {
  private apiClientService = inject(ApiClientService);

  drafts = signal<DecryptedDocument[]>([]);
  isLoading = signal<boolean>(false);
  draftsCount = computed(() => this.drafts().length);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const draftsResponse = await firstValueFrom(this.apiClientService.getAllDrafts());
      this.drafts.set(draftsResponse);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
