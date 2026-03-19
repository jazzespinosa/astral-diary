import { CommonModule, DatePipe, formatDate } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { NavigationEnd, Router } from '@angular/router';
import { filter, lastValueFrom, map } from 'rxjs';
import { GeneralAppService } from 'app/services/general-app.service';
import { DialogModule } from 'primeng/dialog';
import { ApiClientService } from 'app/services/api-client.service';
import { Popover, PopoverModule } from 'primeng/popover';
import { GalleriaModule } from 'primeng/galleria';
import { HashService } from 'app/services/hash.service';
import {
  AttachmentObjResponse,
  EntryParentComponentInput,
  EntryValues,
  GalleryItem,
} from 'app/models/entry.models';
import { ErrorMessageComponent } from '../error-message/error-message.component';
import { GetImagePipe } from '../../pipes/get-image.pipe';
import { AttachmentService } from 'app/services/attachment.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-entry',
  imports: [
    CommonModule,
    DatePickerModule,
    ReactiveFormsModule,
    FileUploadModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DialogModule,
    PopoverModule,
    GalleriaModule,
    ErrorMessageComponent,
    GetImagePipe,
  ],
  templateUrl: './entry.component.html',
  styleUrl: './entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryComponent implements OnInit, OnDestroy, AfterViewInit {
  // inject dependencies
  private appService = inject(GeneralAppService);
  private entryService = inject(ApiClientService);
  private attachmentService = inject(AttachmentService);
  private hashService = inject(HashService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private formBuilder = inject(FormBuilder);
  private domSanitizer = inject(DomSanitizer);

  // inputs
  parentComponent = input.required<EntryParentComponentInput>();
  sourceId = input<string | null>();
  access = input.required<'new' | 'view' | 'edit'>();
  values = input.required<EntryValues>();

  header = computed(() => {
    switch (this.access()) {
      case 'new':
        return {
          label: 'Creating New Entry',
          icon: 'fa-solid fa-file-circle-plus fa-xl',
        };
      case 'view':
        return {
          label: 'Viewing Entry',
          icon: 'fa-solid fa-book-open fa-xl',
        };
      case 'edit':
        return {
          label: 'Editing Entry',
          icon: 'fa-solid fa-pencil fa-xl',
        };
      default:
        return {
          label: '',
          icon: '',
        };
    }
  });

  placeholder = computed(() =>
    this.access() === 'new' ? 'Start writing your thoughts here...' : '',
  );

  isParentFullEntryPage = computed(
    () =>
      this.parentComponent() === 'add-entry' ||
      this.parentComponent() === 'edit-entry' ||
      this.parentComponent() === 'view-entry',
  );

  // variables
  readonly maxFileSize = 10485760; // 10MB
  fileSize = signal(0);

  titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleRef');
  measuringSpan = viewChild.required<ElementRef<HTMLSpanElement>>('measuringSpan');
  paperInnerRef = viewChild.required<ElementRef<HTMLDivElement>>('paperInnerRef');
  contentRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('contentRef');
  attachmentRef = viewChild.required<FileUpload>('attachment');

  form!: FormGroup;
  private formSubmitted = false;
  selectedFiles: File[] = [];

  attachments = input<AttachmentObjResponse[]>([]);
  gallery = signal<GalleryItem[]>([]);
  displayCustom = signal(false);
  activeIndex = signal(0);

  // paper state
  paperTransitionState = signal<'hidden' | 'flying' | 'zoomin'>('hidden');
  isExpanded = signal(false);
  isAttachmentOpen = model(false);

  constructor() {
    effect(() => {
      if (this.appService.isEntryOpen()) this.summonPaper();
    });
  }

  ngOnInit(): void {
    switch (this.access()) {
      case 'new':
        this.form = this.formBuilder.group({
          date: [this.values().date, Validators.required],
          title: ['', [Validators.required, Validators.maxLength(100)]],
          content: ['', [Validators.required, Validators.maxLength(5000)]],
        });
        break;
      case 'view':
        this.form = this.formBuilder.group({
          date: [{ value: this.values().date, disabled: true }],
          title: [{ value: this.values().title, disabled: true }],
          content: [{ value: this.values().content, disabled: true }],
        });

        // this.loadViewGallery();
        break;
      case 'edit':
        this.form = this.formBuilder.group({
          date: [this.values().date, Validators.required],
          title: [this.values().title, [Validators.required, Validators.maxLength(100)]],
          content: [this.values().content, [Validators.required, Validators.maxLength(5000)]],
        });

        this.loadEditAttachment();
        break;
      default:
        break;
    }
  }

  ngAfterViewInit(): void {
    if (this.access() !== 'new') {
      this.entryTitleAutoGrow(this.titleRef().nativeElement, this.measuringSpan().nativeElement);
      this.entryContentAutoGrow(
        this.paperInnerRef().nativeElement,
        this.contentRef().nativeElement,
      );
      setTimeout(() => {
        this.paperInnerRef().nativeElement.scrollTop = 0;
      }, 200);
    }
  }

  ngOnDestroy(): void {
    this.reset();
    this.appService.setIsEntryOpen(false);
  }

  entryTitleAutoGrow(titleRef: HTMLInputElement, measuringSpan: HTMLSpanElement) {
    measuringSpan.textContent = titleRef.value;
    const pixelWidth = measuringSpan.offsetWidth;
    titleRef.style.width = pixelWidth + 2 + 'px';
  }

  entryContentAutoGrow(container: HTMLElement, textarea: HTMLTextAreaElement) {
    const prevScrollTop = container.scrollTop;
    const prevScrollHeight = container.scrollHeight;
    const fontSize = +window.getComputedStyle(textarea).fontSize.slice(0, -2);
    const wasAtBottom = prevScrollTop + container.clientHeight >= prevScrollHeight - fontSize;

    // resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // restore/adjust parent scroll after layout updates
    requestAnimationFrame(() => {
      if (wasAtBottom) {
        container.scrollTop = container.scrollHeight; // follow typing
      } else {
        container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight); // no jump
      }
    });
  }

  async onSubmitEntry() {
    this.formSubmitted = true;
    let entryFormData = new FormData();
    entryFormData = await this.appendFormData(entryFormData);

    if (this.form.invalid) {
      this.appService.setErrorToast('There are error(s) in the form. Please review and try again.');
      return;
    }

    if (this.sourceId() && this.sourceId()?.startsWith('entry-')) {
      entryFormData.append('id', this.sourceId()!);
      this.entryService
        .updateEntry(this.sourceId()!, entryFormData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.appService.setSuccessToast('Entry updated successfully.');

            this.resetForm();
            if (this.isParentFullEntryPage()) {
              this.router.navigate(['entry/search']);
            } else {
              this.appService.setIsEntryOpen(false);
            }
          },
          error: (error) => {
            console.log(error);
            this.appService.setErrorToast('Failed to update entry.');
          },
        });
    } else if (this.sourceId() && this.sourceId()?.startsWith('draft-')) {
      entryFormData.append('id', this.sourceId()!);
      this.entryService
        .updateDraft(this.sourceId()!, entryFormData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.appService.setSuccessToast('Draft updated successfully.');

            this.resetForm();
            if (this.isParentFullEntryPage()) {
              this.router.navigate(['entry/drafts']);
            } else {
              this.appService.setIsEntryOpen(false);
            }
          },
          error: (error) => {
            console.log(error);
            this.appService.setErrorToast('Failed to update draft.');
          },
        });
    } else {
      this.entryService
        .createEntry(entryFormData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.appService.setSuccessToast('Entry created successfully.');

            this.resetForm();
            const location = response.headers.get('Location');
            const entryId = location?.split('/').pop();
            this.router.navigate([`entry/view/${entryId}`]);
          },
          error: (error) => {
            console.log(error);
            this.appService.setErrorToast('Failed to create entry.');
          },
        });
    }

    this.formSubmitted = false;
    this.reset();
  }

  async onSaveAsDraft() {
    this.formSubmitted = true;

    this.entryService
      .countUserDrafts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.count >= 10) {
            this.appService.setErrorToast('You have reached the maximum number of drafts (10).');
            return;
          }
        },
        error: (error) => {
          console.log(error);
        },
      });

    let draftFormData = new FormData();
    draftFormData = await this.appendFormData(draftFormData);

    if (this.form.get('entryDate')?.invalid) {
      this.appService.setErrorToast('Please fill out required fields.');
      return;
    }

    this.entryService
      .createDraft(draftFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appService.setSuccessToast('Draft saved successfully.');

          this.resetForm();
          this.router.navigate(['entry/drafts']);
        },
        error: (error) => {
          console.log(error);
          this.appService.setErrorToast('Failed to create draft.');
        },
      });

    this.formSubmitted = false;
    this.reset();
  }

  deleteEntry() {
    const entityId = this.sourceId();
    if (!entityId) {
      this.appService.setErrorToast('No entry ID found.');
      return;
    }

    if (this.sourceId()?.startsWith('draft-')) {
      this.entryService
        .deleteDraft(entityId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.appService.setSuccessToast('Draft deleted successfully.');

            if (this.isParentFullEntryPage()) {
              this.router.navigate(['entry/drafts']);
            } else {
              this.appService.setIsEntryOpen(false);
            }
          },
          error: (error) => {
            console.log(error);
            this.appService.setErrorToast('Failed to delete draft.');
          },
        });
    } else if (this.sourceId()?.startsWith('entry-')) {
      this.entryService
        .deleteEntry(entityId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.appService.setSuccessToast('Entry deleted successfully.');

            this.appService.triggerRefreshCalendarEvents();

            if (this.isParentFullEntryPage()) {
              this.router.navigate(['entry/search']);
            } else {
              this.appService.setIsEntryOpen(false);
            }
          },
          error: (error) => {
            console.log(error);
            this.appService.setErrorToast('Failed to delete entry.');
          },
        });
    }
  }

  async loadViewGallery() {
    const entityId = this.sourceId();
    if (!entityId) return;

    // this.isLoading.set(true);

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
    } finally {
      // this.isLoading.set(false);
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

      this.selectedFiles = files;
      this.attachmentRef().files = files;
      this.updateFileSize();
    } catch (error) {
      console.error('Failed to load attachments', error);
    } finally {
      // this.isLoading.set(false);
    }
  }

  imageClick(index: number) {
    if (this.gallery().length === 0) {
      this.loadViewGallery();
    }
    this.activeIndex.set(index);
    this.displayCustom.set(true);
  }

  toEditFromView() {
    this.router.navigate(['entry/edit', this.sourceId()]);
  }

  private async appendFormData(formData: FormData): Promise<FormData> {
    const formattedDate = formatDate(this.form.value.date, 'yyyy-MM-dd', 'en-US');
    formData.append('Date', formattedDate);
    formData.append('Title', this.form.value.title);
    formData.append('Content', this.form.value.content);

    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles[i];
      const hash = await this.hashService.hashFile(file);

      formData.append(`Attachments[${i}].ContentHash`, hash);
      formData.append(`Attachments[${i}].File`, file);
    }

    return formData;
  }

  isInvalid(form: FormGroup, controlName: string) {
    const control = form.get(controlName);
    return control?.invalid && (control.touched || this.formSubmitted);
  }

  private resetForm() {
    this.form.reset({
      date: this.values().date,
      title: '',
      content: '',
    });
    this.attachmentRef().clear();
    this.selectedFiles = [];
    this.updateFileSize();
  }

  private summonPaper() {
    if (this.isParentFullEntryPage()) {
      this.isExpanded.set(true);
      return;
    }

    this.paperTransitionState.set(this.access() === 'new' ? 'flying' : 'zoomin');

    // show paper lines and content
    setTimeout(
      () => {
        this.isExpanded.set(true);
      },
      this.access() !== 'new' ? 100 : 500,
    );
  }

  showAttachment() {
    this.isAttachmentOpen.update((value) => !value);
  }

  async onAttachmentSelect(event: any, fileUpload: FileUpload) {
    this.selectedFiles = event.currentFiles;
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
      this.appService.setErrorToast('File size exceeds maximum limit.');
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
          this.appService.setErrorToast(
            `Duplicate file(s) detected. Removed "${removedFiles[i].name}".`,
          );
        }, 200);
      }
    }

    fileUpload.files = uniqueFiles;
    this.selectedFiles = [...uniqueFiles];
    this.updateFileSize();
    this.isAttachmentOpen.set(false);
  }

  private updateFileSize() {
    this.fileSize.set(this.selectedFiles.reduce((total, file) => total + file.size, 0));
  }

  onRemoveFile(event: any, fileUpload: FileUpload = this.attachmentRef()) {
    this.selectedFiles = fileUpload.files;
    const currentFileSize = this.fileSize();
    this.fileSize.set(currentFileSize - event.file.size);
    // this.updateFileSize();
  }

  onClearFiles(fileUpload: FileUpload) {
    this.selectedFiles = fileUpload.files;
    this.updateFileSize();
  }

  backgroundClick() {
    switch (this.parentComponent()) {
      case 'home':
      case 'calendar':
        this.reset();
        break;
      default:
        break;
    }
  }

  reset() {
    this.isAttachmentOpen.set(false);
    this.paperTransitionState.set('hidden');

    if (!this.isParentFullEntryPage()) {
      this.isExpanded.set(false);
      this.appService.setIsEntryOpen(false);
    }
  }
}
