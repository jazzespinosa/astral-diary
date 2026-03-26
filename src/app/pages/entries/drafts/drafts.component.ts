import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { GetDraftResponse } from 'app/models/entry.models';
import { ApiClientService } from 'app/services/api-client.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CardComponent } from 'app/shared/components/card/card.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';

@Component({
  selector: 'app-drafts',
  imports: [ButtonModule, CardModule, CardComponent, LoadingComponent],
  templateUrl: './drafts.component.html',
  styleUrl: './drafts.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DraftsComponent implements OnInit {
  private router = inject(Router);
  private entryService = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);

  drafts = signal<GetDraftResponse[]>([]);
  isLoading = signal<boolean>(false);
  draftsCount = computed(() => this.drafts().length);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.entryService
      .getDrafts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draftsResponse) => {
          this.drafts.set(draftsResponse);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error(error);
        },
      });
  }

  onDraftClick(draft: GetDraftResponse) {
    this.router.navigate(['entry/edit', draft.draftId]);
  }
}
