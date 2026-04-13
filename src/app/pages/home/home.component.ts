import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { GeneralAppService } from 'app/services/general-app.service';
import { RouterOutlet } from '@angular/router';
import { EntryService } from 'app/services/entry.service';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from 'app/services/api-client.service';
import { DecryptedDocument, EntryAccess, EntryIdObj } from 'app/models/entry.models';
import { AuthService } from 'app/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [EntryComponent, RouterOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnDestroy {
  protected generalAppService = inject(GeneralAppService);
  private entryService = inject(EntryService);
  private apiClientService = inject(ApiClientService);
  private authService = inject(AuthService);

  access = signal<EntryAccess>('new');
  document = signal<DecryptedDocument | null>(null);
  userEntries = signal<EntryIdObj[] | null>(null);

  constructor() {
    effect(async () => {
      if (!this.authService.activeUser()) return;

      let fetchedUserEntries: EntryIdObj[] | null = null;
      try {
        fetchedUserEntries = await firstValueFrom(this.apiClientService.getEntryIds());
      } catch (error) {
        console.error(error);
      }

      if (!fetchedUserEntries) {
        return;
      }

      this.userEntries.set(fetchedUserEntries);
    });

    effect(async () => {
      if (!this.authService.activeUser()) return;

      if (this.entryService.starClickTrigger() > 0) {
        await this.onMainStarClicked();
      }
    });

    effect(async () => {
      if (!this.authService.activeUser()) return;

      if (this.entryService.homeAccessTrigger() > 0) {
        await this.onMoonClicked();
      }
    });
  }

  ngOnDestroy(): void {
    this.entryService.resetHomeAccessTrigger();
    this.entryService.resetStarClickTrigger();
  }

  async onMainStarClicked() {
    const fetchedUserEntries = this.userEntries();
    if (!fetchedUserEntries) {
      return;
    }
    const rand = Math.floor(Math.random() * fetchedUserEntries.length);
    const randomEntryId = fetchedUserEntries[rand].entryId;

    try {
      const entry = await firstValueFrom(this.apiClientService.getEntry(randomEntryId));

      this.document.set(entry);
      this.access.set('view');
      this.generalAppService.setIsEntryOpen(true);
    } catch (error) {
      console.error(error);
    }
  }

  onMoonClicked() {
    this.document.set(null);
    this.access.set('new');
    this.generalAppService.setIsEntryOpen(true);
  }
}
