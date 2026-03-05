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
import { filter } from 'rxjs';
import { AppService } from 'app/services/app.service';
import { DialogModule } from 'primeng/dialog';
import { EntryService } from 'app/services/entry.service';
import { PopoverModule } from 'primeng/popover';
import { HashService } from 'app/services/hash.service';
import { EntryParentComponentInput } from 'app/models/entry.models';

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
  ],
  templateUrl: './entry.component.html',
  styleUrl: './entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryComponent implements OnInit, OnDestroy, AfterViewInit {
  // inject dependencies
  private appService = inject(AppService);
  private entryService = inject(EntryService);
  private hashService = inject(HashService);
  private formBuilder = inject(FormBuilder);

  // inputs
  parentComponent = input.required<EntryParentComponentInput>();
  access = input.required<'new' | 'view' | 'edit'>();
  values = input.required<{ date: Date; title: string; content: string }>();

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

  // variables
  readonly maxFileSize = 10485760; // 10MB
  fileSize = signal(0);

  titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleRef');
  measuringSpan = viewChild.required<ElementRef<HTMLSpanElement>>('measuringSpan');
  paperInnerRef = viewChild.required<ElementRef<HTMLDivElement>>('paperInnerRef');
  contentRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('contentRef');
  attachment = viewChild.required<FileUpload>('attachment');

  form!: FormGroup;
  private formSubmitted = false;
  selectedFiles: File[] = [];

  // paper state
  paperState = signal<'hidden' | 'flying' | 'zoomin'>('hidden');
  isExpanded = signal(false);
  isAttachmentOpen = model(false);

  constructor() {}

  ngOnInit(): void {
    if (this.appService.isEntryOpen()) {
      this.summonPaper();
    }

    switch (this.access()) {
      case 'new':
        this.form = this.formBuilder.group({
          date: [this.values().date, Validators.required],
          title: ['', Validators.required],
          content: ['', Validators.required],
        });
        break;
      case 'view':
        this.form = this.formBuilder.group({
          date: [{ value: this.values().date, disabled: true }],
          title: [{ value: this.values().title, disabled: true }],
          content: [{ value: this.values().content, disabled: true }],
        });
        break;
      case 'edit':
        this.form = this.formBuilder.group({
          date: [this.values().date],
          title: [this.values().title],
          content: [this.values().content],
        });
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
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill out all fields.',
      });
      return;
    }

    this.entryService.createEntry(entryFormData).subscribe({
      next: (response) => {
        console.log(response);
        this.appService.setToastMessage({
          severity: 'success',
          summary: 'Success',
          detail: 'Entry created successfully.',
        });

        this.resetForm();
      },
      error: (error) => {
        console.log(error);
        this.appService.setToastMessage({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create entry.',
        });
      },
    });

    this.formSubmitted = false;
    this.reset();
  }

  async onSaveAsDraft() {
    this.formSubmitted = true;
    let draftFormData = new FormData();
    draftFormData = await this.appendFormData(draftFormData);

    if (this.form.get('entryDate')?.invalid) {
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill out required fields.',
      });
      return;
    }

    this.entryService.createDraft(draftFormData).subscribe({
      next: (response) => {
        console.log(response);
        this.appService.setToastMessage({
          severity: 'success',
          summary: 'Success',
          detail: 'Draft saved successfully.',
        });

        this.resetForm();
      },
      error: (error) => {
        console.log(error);
        this.appService.setToastMessage({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create draft.',
        });
      },
    });

    this.formSubmitted = false;
    this.reset();
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

  private resetForm() {
    this.form.reset({
      date: this.values().date,
      title: '',
      content: '',
    });
    this.attachment().clear();
    this.selectedFiles = [];
    this.updateFileSize();
  }

  private summonPaper() {
    if (this.parentComponent() === 'add-entry' || this.parentComponent() === 'view-entry') {
      this.isExpanded.set(true);
      return;
    }

    this.paperState.set(this.access() === 'new' ? 'flying' : 'zoomin');

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
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'File size exceeds maximum limit.',
      });
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
          this.appService.setToastMessage({
            severity: 'error',
            summary: 'Error',
            detail: `Duplicate file(s) detected. Removed "${removedFiles[i].name}".`,
          });
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

  onRemoveFile(event: any, fileUpload: FileUpload = this.attachment()) {
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
      case 'add-entry':
      case 'view-entry':
      default:
        break;
    }
  }

  reset() {
    this.isAttachmentOpen.set(false);
    this.paperState.set('hidden');

    if (this.parentComponent() !== 'add-entry' && this.parentComponent() !== 'view-entry') {
      this.isExpanded.set(false);
      this.appService.setIsEntryOpen(false);
    }
  }
}
