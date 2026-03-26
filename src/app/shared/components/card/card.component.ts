import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { GenericEntry, GetDraftResponse, GetEntryResponse } from 'app/models/entry.models';
import { GetImagePipe } from 'app/shared/pipes/get-image.pipe';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-card',
  imports: [CardModule, DatePipe, GetImagePipe, AsyncPipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CardComponent {
  private router = inject(Router);

  entry = input.required<GetEntryResponse | GetDraftResponse>();
  normalizedEntry = computed<GenericEntry>(() => {
    const value = this.entry();

    if ('entryId' in value) {
      return {
        id: value.entryId,
        ...value,
      };
    } else if ('draftId' in value) {
      return {
        id: value.draftId,
        ...value,
      };
    }

    return {
      id: '',
      date: new Date(),
      title: '',
      content: '',
      mood: null,
      attachments: null,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
  });

  onEntryClick(entry: GenericEntry) {
    if (entry.id.startsWith('draft')) {
      this.router.navigate(['entry/edit', entry.id]);
    } else if (entry.id.startsWith('entry')) {
      this.router.navigate(['entry/view', entry.id]);
    } else {
      this.router.navigate(['entry/search']);
    }
  }
}
