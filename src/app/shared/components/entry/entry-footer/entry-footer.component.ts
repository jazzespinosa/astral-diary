import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  AttachmentObjResponse,
  EntryAccess,
  GalleryItem,
  SubmitAction,
} from 'app/models/entry.models';
import { AttachmentService } from 'app/services/attachment.service';
import { EntryService } from 'app/services/entry.service';
import { GeneralAppService } from 'app/services/general-app.service';
import { HashService } from 'app/services/hash.service';
import { GetImagePipe } from 'app/shared/pipes/get-image.pipe';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { PopoverModule } from 'primeng/popover';
import { lastValueFrom, map } from 'rxjs';

@Component({
  selector: 'app-entry-footer',
  imports: [
    CommonModule,
    DialogModule,
    FileUploadModule,
    ButtonModule,
    PopoverModule,
    GalleriaModule,
    GetImagePipe,
  ],
  templateUrl: './entry-footer.component.html',
  styleUrl: './entry-footer.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryFooterComponent implements OnInit {
  entryService = inject(EntryService);
  private attachmentService = inject(AttachmentService);
  private hashService = inject(HashService);
  private generalAppService = inject(GeneralAppService);

  private domSanitizer = inject(DomSanitizer);

  sourceId = input.required<string | null>();
  access = input.required<EntryAccess>();
  isEntryPaperExpanded = input.required<boolean>();
  attachments = input<AttachmentObjResponse[]>([]);
  files = input.required<File[]>();
  selectedFiles = signal<File[]>([]);

  submit = output<SubmitAction>();
  saveAsDraft = output<void>();
  publishDraft = output<void>();
  delete = output<'entry' | 'draft'>();
  attachmentsChange = output<File[]>();

  readonly maxFileSize = 10485760; // 10MB
  fileSize = signal(0);

  gallery = signal<GalleryItem[]>([]);
  displayCustom = signal(false);
  activeIndex = signal(0);

  isAttachmentOpen = model(false);

  attachmentRef = viewChild.required<FileUpload>('attachment');

  popoverOptions: { label: string; action: () => void }[] = [];

  submitButton = signal({ label: 'Submit', action: 'create' as SubmitAction });

  constructor() {
    effect(() => {
      if (this.access() !== 'view') {
        this.attachmentsChange.emit(this.selectedFiles());
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

      case 'edit-entry':
        this.popoverOptions = [
          {
            label: 'Save as Draft',
            action: () => this.onSaveAsDraft(),
          },
          {
            label: 'Delete Entry',
            action: () => this.onDelete('entry'),
          },
        ];
        this.submitButton.set({ label: 'Update Entry', action: 'update-entry' });
        if (this.attachments().length > 0) {
          this.loadEditAttachment();
        }
        break;

      case 'edit-draft':
        this.popoverOptions = [
          {
            label: 'Publish Draft',
            action: () => this.onPublishDraft(),
          },
          {
            label: 'Delete Draft',
            action: () => this.onDelete('draft'),
          },
        ];
        this.submitButton.set({ label: 'Update Draft', action: 'update-draft' });
        if (this.attachments().length > 0) {
          this.loadEditAttachment();
        }
        break;
    }
  }

  onSubmit(action: SubmitAction) {
    this.submit.emit(action);
  }

  onSaveAsDraft() {
    this.saveAsDraft.emit();
  }

  onPublishDraft() {
    this.publishDraft.emit();
  }

  onDelete(type: 'entry' | 'draft') {
    this.delete.emit(type);
  }

  showAttachment() {
    this.isAttachmentOpen.set(true);
  }

  async loadViewGallery() {
    const entityId = this.sourceId();
    if (!entityId) return;

    try {
      const fileList = this.attachments();
      const processedItems = await Promise.all(
        fileList.map(async (file) => {
          const blob = await lastValueFrom(
            this.attachmentService.getAttachment(entityId, file.internalFileName),
          );
          const url = URL.createObjectURL(blob);

          return {
            internalFileName: file.internalFileName,
            objectUrl: url,
            localUrl: this.domSanitizer.bypassSecurityTrustUrl(url),
          };
        }),
      );
      this.gallery.set(processedItems);
    } catch (error) {
      console.error('Failed to load gallery', error);
    }
  }

  async loadEditAttachment() {
    const entityId = this.sourceId();
    if (!entityId) return;

    const fileList = this.attachments();
    if (!fileList || fileList.length === 0) return;

    try {
      const files: File[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = await lastValueFrom(
          this.attachmentService.getAttachment(entityId, fileList[i].internalFileName).pipe(
            map((blob: Blob) => {
              const newFile = new File([blob], fileList[i].originalFileName, {
                type: blob.type,
                lastModified: Date.now(),
              });
              (newFile as any).objectURL = this.domSanitizer.bypassSecurityTrustUrl(
                URL.createObjectURL(newFile),
              );
              return newFile;
            }),
          ),
        );
        files.push(file);
      }

      this.selectedFiles.set([...files]);
      this.attachmentRef().files = files;
      this.updateFileSize();
    } catch (error) {
      console.error('Failed to load attachments', error);
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

  imageClick(index: number) {
    if (this.gallery().length === 0) {
      this.loadViewGallery();
    }
    this.activeIndex.set(index);
    this.displayCustom.set(true);
  }

  private updateFileSize() {
    this.fileSize.set(this.selectedFiles().reduce((total, file) => total + file.size, 0));
  }

  onRemoveFile(event: any, fileUpload: FileUpload = this.attachmentRef()) {
    this.selectedFiles.set(fileUpload.files);
    const currentFileSize = this.fileSize();
    this.fileSize.set(currentFileSize - event.file.size);
    // this.updateFileSize();
  }

  onClearFiles(fileUpload: FileUpload) {
    this.selectedFiles.set(fileUpload.files);
    this.updateFileSize();
  }
}
