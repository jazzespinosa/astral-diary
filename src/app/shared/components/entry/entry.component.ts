import { CommonModule, DatePipe, formatDate } from '@angular/common';
import {
  AfterViewInit,
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
import { EntryType } from 'app/models/entry.models';
import { PopoverModule } from 'primeng/popover';

export type EntryParentComponentInput = 'home' | 'add-entry' | 'calendar';

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
  private formBuilder = inject(FormBuilder);

  // inputs
  parentComponent = input.required<EntryParentComponentInput>();
  access = input.required<'new' | 'view' | 'edit'>();
  entryValues = input.required<{ entryDate: Date; entryTitle: string; entryContent: string }>();

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
  currentFileSize = signal(0);
  fileCount = signal(0);

  titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleRef');
  measuringSpan = viewChild.required<ElementRef<HTMLSpanElement>>('measuringSpan');
  paperInnerRef = viewChild.required<ElementRef<HTMLDivElement>>('paperInnerRef');
  contentRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('contentRef');

  form!: FormGroup;
  private formSubmitted = false;
  private selectedFiles: File[] = [];

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
          entryDate: [this.entryValues().entryDate, Validators.required],
          entryTitle: ['', Validators.required],
          entryContent: ['', Validators.required],
        });
        break;
      case 'view':
        this.form = this.formBuilder.group({
          entryDate: [{ value: this.entryValues().entryDate, disabled: true }],
          entryTitle: [{ value: this.entryValues().entryTitle, disabled: true }],
          entryContent: [{ value: this.entryValues().entryContent, disabled: true }],
        });
        break;
      case 'edit':
        this.form = this.formBuilder.group({
          entryDate: [this.entryValues().entryDate],
          entryTitle: [this.entryValues().entryTitle],
          entryContent: [this.entryValues().entryContent],
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
    titleRef.style.width = pixelWidth + 'px';
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

  onSubmit() {
    this.formSubmitted = true;

    if (this.form.invalid) {
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill out all required fields',
      });
      return;
    }

    let formData = new FormData();
    const formattedDate = formatDate(this.form.value.entryDate, 'yyyy-MM-dd', 'en-US');
    formData.append('entryDate', formattedDate);
    formData.append('entryTitle', this.form.value.entryTitle);
    formData.append('entryContent', this.form.value.entryContent);
    formData.append('entryType', EntryType.Entry);
    this.selectedFiles.forEach((file) => {
      formData.append('entryAttachments', file);
    });

    this.entryService.createEntry(formData).subscribe({
      next: (response) => {
        console.log(response);
        this.appService.setToastMessage({
          severity: 'success',
          summary: 'Success',
          detail: 'Entry created successfully',
        });

        this.form.reset({
          entryDate: this.entryValues().entryDate,
          entryTitle: '',
          entryContent: '',
        });
        this.selectedFiles = [];
        this.currentFileSize.set(0);
        this.fileCount.set(0);
      },
      error: (error) => {
        console.log(error);
        this.appService.setToastMessage({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create entry',
        });
      },
    });

    console.log(formData);

    this.formSubmitted = false;
    this.reset();
  }

  onSaveAsDraft() {}

  isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control?.invalid && (control.touched || this.formSubmitted);
  }

  private summonPaper() {
    if (this.parentComponent() === 'add-entry') {
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

  onAttachmentSelect(event: any, fileUpload: FileUpload) {
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

    this.currentFileSize.set(fileSize);
    this.fileCount.set(this.selectedFiles.length);

    if (isFileSizeExceeding) {
      this.appService.setToastMessage({
        severity: 'error',
        summary: 'Error',
        detail: 'File size exceeds maximum limit',
      });
    }
  }

  onRemoveFile(event: any) {
    let fileSize = 0;
    for (let i = 0; i < this.selectedFiles.length; i++) {
      fileSize += this.selectedFiles[i].size;
    }
    fileSize -= event.file.size;
    this.currentFileSize.set(fileSize);
    this.fileCount.set(this.selectedFiles.length - 1);
  }

  onClearFiles() {
    this.currentFileSize.set(0);
    this.fileCount.set(0);
  }

  backgroundClick() {
    switch (this.parentComponent()) {
      case 'home':
      case 'calendar':
        this.reset();
        break;
      case 'add-entry':
      default:
        break;
    }
  }

  reset() {
    this.isAttachmentOpen.set(false);
    this.paperState.set('hidden');

    if (this.parentComponent() !== 'add-entry') {
      this.isExpanded.set(false);
      this.appService.setIsEntryOpen(false);
    }
  }
}
