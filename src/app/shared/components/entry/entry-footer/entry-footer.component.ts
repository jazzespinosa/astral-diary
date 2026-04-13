import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  input,
  model,
  OnInit,
  OnDestroy,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { EntryAccess, GalleryItem, GalleryItemFile, SubmitAction } from 'app/models/entry.models';
import { AttachmentService } from 'app/services/attachment.service';
import { GeneralAppService } from 'app/services/general-app.service';
import { HashService } from 'app/services/hash.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { PopoverModule } from 'primeng/popover';
import { ThumbnailViewerComponent } from '../../thumbnail-viewer/thumbnail-viewer.component';

@Component({
  selector: 'app-entry-footer',
  imports: [
    CommonModule,
    DialogModule,
    FileUploadModule,
    ButtonModule,
    PopoverModule,
    GalleriaModule,
    ThumbnailViewerComponent,
  ],
  templateUrl: './entry-footer.component.html',
  styleUrl: './entry-footer.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryFooterComponent implements OnInit, OnDestroy {
  private attachmentService = inject(AttachmentService);
  private hashService = inject(HashService);
  private generalAppService = inject(GeneralAppService);

  sourceId = input.required<string | null>();
  access = input.required<EntryAccess>();
  isEntryPaperExpanded = input.required<boolean>();
  attachmentId = input<string | null>(null);
  files = input.required<File[]>();

  submit = output<SubmitAction>();
  saveAsDraft = output<void>();
  publishDraft = output<void>();
  delete = output<void>();
  attachmentsChange = output<File[]>();
  showInfo = output<void>();

  readonly maxFileSize = 10485760; // 10MB
  selectedFiles = signal<File[]>([]);
  fileSize = signal(0);
  thumbnails = signal<GalleryItem[]>([]);
  gallery = signal<GalleryItem[]>([]);
  displayGalleryViewer = signal(false);
  activeIndex = signal(0);
  submitButton = signal({ label: 'Submit', action: 'create' as SubmitAction });

  isAttachmentOpen = model(false);

  attachmentRef = viewChild<FileUpload>('attachment');

  popoverOptions: { label: string; action: () => void }[] = [];

  constructor() {
    effect(() => {
      if (this.access() !== 'view') {
        this.attachmentsChange.emit(this.selectedFiles());
      }
    });

    effect(() => {
      const ref = this.attachmentRef();
      const files = this.selectedFiles();
      if (ref && files.length > 0) {
        ref.files = [...files];
      }
    });
  }

  ngOnInit(): void {
    this.selectedFiles.set([...this.files()]);

    switch (this.access()) {
      case 'new':
        this.popoverOptions = [
          {
            label: 'Save as Draft',
            action: () => this.onSaveAsDraft(),
          },
        ];
        this.submitButton.set({ label: 'Submit', action: 'create' });
        break;
      case 'view':
        this.getThumbnailsFromServer(this.attachmentId() ?? '');
        break;
      case 'edit-entry':
        this.popoverOptions = [
          {
            label: 'Show Info',
            action: () => this.onShowInfo(),
          },
          {
            label: 'Save as Draft',
            action: () => this.onSaveAsDraft(),
          },
          {
            label: 'Delete Entry',
            action: () => this.onDelete(),
          },
        ];
        this.submitButton.set({ label: 'Update Entry', action: 'update-entry' });
        if (this.attachmentId()) {
          this.loadAttachmentFiles(this.attachmentId() ?? '');
        }
        break;

      case 'edit-draft':
        this.popoverOptions = [
          {
            label: 'Show Info',
            action: () => this.onShowInfo(),
          },
          {
            label: 'Publish Draft',
            action: () => this.onPublishDraft(),
          },
          {
            label: 'Delete Draft',
            action: () => this.onDelete(),
          },
        ];
        this.submitButton.set({ label: 'Update Draft', action: 'update-draft' });
        if (this.attachmentId()) {
          this.loadAttachmentFiles(this.attachmentId() ?? '');
        }
        break;
      default:
        break;
    }
  }

  ngOnDestroy(): void {
    this.attachmentService.cleanupImageUrls(this.gallery());
    this.attachmentService.cleanupImageUrls(this.thumbnails());
  }

  onSubmit(action: SubmitAction) {
    this.submit.emit(action);
  }

  onShowInfo() {
    this.showInfo.emit();
  }

  onSaveAsDraft() {
    this.saveAsDraft.emit();
  }

  onPublishDraft() {
    this.publishDraft.emit();
  }

  onDelete() {
    this.delete.emit();
  }

  showAttachment() {
    this.isAttachmentOpen.set(true);
  }

  private async getThumbnailsFromServer(attachmentId: string) {
    const entityId = this.sourceId();
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

  private async getAttachmentsFromServer(attachmentId: string) {
    const entityId = this.sourceId();
    if (!entityId || !attachmentId) return;

    try {
      let items: GalleryItemFile[] | null = null;
      let isCached = false;

      const cachedFiles = this.attachmentService.getFilesFromCache(entityId, 'attachment');
      if (cachedFiles && cachedFiles.length > 0) {
        items = cachedFiles;
        isCached = true;
      } else {
        items = await this.attachmentService.processIncomingAttachments(
          entityId,
          'attachment',
          attachmentId,
        );
      }

      const files = items.map((item) => item.file);
      if (!isCached) this.attachmentService.saveFilesToCache(entityId, files, 'attachment');

      const attachmentFiles: GalleryItem[] = items.map((item) => {
        return {
          fileName: item.fileName,
          objectUrl: item.objectUrl,
          localUrl: item.localUrl,
        };
      });

      this.gallery.set(attachmentFiles);
    } catch (error) {
      console.error('Failed to load files', error);
    }
  }

  private async loadAttachmentFiles(attachmentId: string) {
    const entityId = this.sourceId();
    if (!entityId || !attachmentId) return;

    try {
      let items: GalleryItemFile[] | null = null;
      let isCached = false;

      const cachedFiles = this.attachmentService.getFilesFromCache(entityId, 'attachment');
      if (cachedFiles && cachedFiles.length > 0) {
        items = cachedFiles;
        isCached = true;
      } else {
        items = await this.attachmentService.processIncomingAttachments(
          entityId,
          'attachment',
          attachmentId,
        );
      }

      const files = items.map((item) => item.file);
      if (!isCached) this.attachmentService.saveFilesToCache(entityId, files, 'attachment');
      this.selectedFiles.set([...files]);
      this.updateFileSize();
    } catch (error) {
      console.error('Failed to load files', error);
    }
  }

  async onValidateAttachments(fileUpload: FileUpload) {
    const files = fileUpload.files;
    const uniqueFiles: File[] = [];
    const seenHashes = new Set<string>();
    const removedFiles: File[] = [];
    let totalSize = 0;

    for (const file of files) {
      const hash = await this.hashService.hashFile(file);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueFiles.push(file);
        totalSize += file.size;
      } else {
        removedFiles.push(file);
      }
    }

    if (removedFiles.length > 0) {
      for (let i = 0; i < removedFiles.length; i++) {
        setTimeout(() => {
          this.generalAppService.setErrorToast(
            `Duplicate file(s) detected. Removed "${removedFiles[i].name}".`,
          );
        }, 200);
      }
    }

    fileUpload.files = uniqueFiles;
    this.selectedFiles.set([...uniqueFiles]);
    this.updateFileSize();
    this.isAttachmentOpen.set(false);
  }

  async onAttachmentSelect(event: any, fileUpload: FileUpload) {
    this.selectedFiles.set([...event.currentFiles]);
    const files = event.currentFiles;
    let fileSize = 0;
    let isFileSizeExceeding = false;

    for (let i = 0; i < files.length; i++) {
      fileSize += files[i].size;
      if (fileSize > this.maxFileSize) {
        isFileSizeExceeding = true;
        fileSize -= files[i].size;
        fileUpload.remove(event, i);
        i--;
      }
    }

    this.updateFileSize();

    if (isFileSizeExceeding) {
      this.generalAppService.setErrorToast('File size exceeds maximum limit.');
    }
  }

  onRemoveFile(event: any, fileUpload: FileUpload) {
    this.selectedFiles.set(fileUpload.files);
    const currentFileSize = this.fileSize();
    this.fileSize.set(currentFileSize - event.file.size);
    // this.updateFileSize();
  }

  onClearFiles(fileUpload: FileUpload) {
    this.selectedFiles.set(fileUpload.files);
    this.updateFileSize();
  }

  imageClick(index: number) {
    if (this.gallery().length === 0) {
      this.getAttachmentsFromServer(this.attachmentId() ?? '');
    }
    this.activeIndex.set(index);
    this.displayGalleryViewer.set(true);
  }

  private updateFileSize() {
    this.fileSize.set(this.selectedFiles().reduce((total, file) => total + file.size, 0));
  }
}
