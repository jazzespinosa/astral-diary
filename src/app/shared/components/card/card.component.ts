import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { DecryptedDocument, GalleryItem } from 'app/models/entry.models';
import { AttachmentService } from 'app/services/attachment.service';
import { CardModule } from 'primeng/card';
import { ThumbnailViewerComponent } from '../thumbnail-viewer/thumbnail-viewer.component';

@Component({
  selector: 'app-card',
  imports: [CommonModule, CardModule, DatePipe, ThumbnailViewerComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private attachmentService = inject(AttachmentService);

  document = input.required<DecryptedDocument>();
  compactView = input<boolean>(false);

  thumbnails = signal<GalleryItem[]>([]);

  constructor() {}

  ngOnInit(): void {
    this.getThumbnailsFromServer(this.document().attachmentId ?? '');
  }

  ngOnDestroy(): void {
    this.attachmentService.cleanupImageUrls(this.thumbnails());
  }

  onItemClick(document: DecryptedDocument) {
    if (document.type === 'draft') {
      this.router.navigate(['entry/edit', document.id]);
    } else if (document.type === 'entry') {
      this.router.navigate(['entry/view', document.id]);
    } else {
      this.router.navigate(['entry/search']);
    }
  }

  private async getThumbnailsFromServer(attachmentId: string) {
    const entityId = this.document().id;
    if (!entityId || !attachmentId) return;

    try {
      const cachedFiles = this.attachmentService.getFilesFromCache(entityId, 'thumbnail');
      if (cachedFiles && cachedFiles.length > 0) {
        this.thumbnails.set(cachedFiles);
        return;
      }

      const items: GalleryItem[] = await this.attachmentService
        .processIncomingAttachments(entityId, 'thumbnail', attachmentId)
        .then((item) => {
          let files = item.map((item) => item.file);
          this.attachmentService.saveFilesToCache(entityId, files, 'thumbnail');

          return item.map((item) => {
            return {
              fileName: item.fileName,
              objectUrl: item.objectUrl,
              localUrl: item.localUrl,
            };
          });
        });

      this.thumbnails.set(items);
    } catch (error) {
      console.error('Failed to load files', error);
    }
  }
}
