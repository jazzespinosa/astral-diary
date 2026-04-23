import { DatePipe } from '@angular/common';
import {
  Component,
  effect,
  inject,
  input,
  model,
  OnDestroy,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecryptedDocument, GalleryItem } from 'app/models/entry.models';
import { ListboxModule } from 'primeng/listbox';
import { SkeletonModule } from 'primeng/skeleton';
import { ThumbnailViewerComponent } from '../thumbnail-viewer/thumbnail-viewer.component';
import { AttachmentService } from 'app/services/attachment.service';
import { MOODS } from '../mood-rating/mood-rating.component';

interface RecoverEntryOption {
  entryId: string;
  title: string;
  date: string;
  content: string;
  mood: number;
  thumbnail: GalleryItem[];
  deletedAt: Date | null;
}

@Component({
  selector: 'app-recycle-bin',
  imports: [FormsModule, ListboxModule, DatePipe, ThumbnailViewerComponent, SkeletonModule],
  templateUrl: './recycle-bin.component.html',
  styleUrl: './recycle-bin.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class RecycleBinComponent implements OnDestroy {
  private attachmentService = inject(AttachmentService);

  deletedEntries = input.required<DecryptedDocument[]>();
  selectedEntryIds = output<string[]>();

  selectedCount = signal<number>(0);
  options = signal<RecoverEntryOption[]>([]);
  isLoading = signal(false);

  moods = MOODS;

  constructor() {
    effect(async () => {
      this.isLoading.set(true);
      const entries = this.deletedEntries();
      const options: RecoverEntryOption[] = [];
      for (const entry of entries) {
        const entryThumbnail = await this.getThumbnails(entry.id, entry.attachmentId);
        options.push({
          entryId: entry.id,
          title: entry.title,
          date: entry.date.toDateString(),
          content: entry.content,
          mood: entry.mood,
          thumbnail: entryThumbnail,
          deletedAt: entry.deletedAt ? new Date(entry.deletedAt + 'Z') : null,
        });
      }
      this.options.set(options);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.attachmentService.cleanupImageUrls(this.options().flatMap((option) => option.thumbnail));
  }

  onSelectionChange(event: any) {
    const entryIds = event.value.map((entry: RecoverEntryOption) => entry.entryId);
    this.selectedCount.set(entryIds.length);
    this.selectedEntryIds.emit(entryIds);
  }

  async getThumbnails(entryId: string, attachmentId: string | null): Promise<GalleryItem[]> {
    if (!attachmentId) {
      return [];
    }
    const items: GalleryItem[] = await this.attachmentService
      .processIncomingAttachments(entryId, 'thumbnail', attachmentId)
      .then((item) => {
        return item.map((item) => {
          return {
            fileName: item.fileName,
            objectUrl: item.objectUrl,
            localUrl: item.localUrl,
          };
        });
      })
      .catch((error) => {
        console.error('Error getting thumbnails:', error);
        return [];
      });

    return items;
  }
}
