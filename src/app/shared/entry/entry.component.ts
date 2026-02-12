import { CommonModule } from '@angular/common';
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
import { FileUpload } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppService } from 'app/services/app.service';

export type EntryComponentInput = 'home' | 'add-entry' | 'calendar';

@Component({
  selector: 'app-entry',
  imports: [
    CommonModule,
    DatePickerModule,
    ReactiveFormsModule,
    FileUpload,
    ButtonModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './entry.component.html',
  styleUrl: './entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryComponent implements OnInit, OnDestroy, AfterViewInit {
  // inject dependencies
  // private ref = inject(ChangeDetectorRef);
  private formBuilder = inject(FormBuilder);
  private appService = inject(AppService);

  // inputs
  parentComponent = input.required<EntryComponentInput>();
  access = input.required<'new' | 'view' | 'edit'>();
  entryValues = input.required<{ entryDate: Date; entryTitle: string; entryContent: string }>();

  header = computed(() => {
    switch (this.access()) {
      case 'new':
        return 'Creating New Entry';
      case 'view':
        return 'Viewing Entry';
      case 'edit':
        return 'Editing Entry';
      default:
        return '';
    }
  });

  placeholder = computed(() => {
    return this.access() === 'new' ? 'Start writing your thoughts here...' : '';
  });

  // variables
  titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleRef');
  measuringSpan = viewChild.required<ElementRef<HTMLSpanElement>>('measuringSpan');
  paperInnerRef = viewChild.required<ElementRef<HTMLDivElement>>('paperInnerRef');
  contentRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('contentRef');

  form!: FormGroup;
  formSubmitted = false;
  selectedFile: any;

  // paper state
  paperState = signal<'hidden' | 'flying' | 'zoomin'>('hidden');
  isExpanded = signal(false);
  isAttachmentOpen = signal(false);

  constructor() {}

  ngOnInit(): void {
    if (this.appService.isEntryOpen()) {
      this.summonPaper();
    }

    // console.log(this.entryValues());

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
          entryDate: [{ value: this.entryValues()?.entryDate, disabled: true }],
          entryTitle: [{ value: this.entryValues()?.entryTitle, disabled: true }],
          entryContent: [{ value: this.entryValues()?.entryContent, disabled: true }],
        });
        break;
      case 'edit':
        this.form = this.formBuilder.group({
          entryDate: [this.entryValues()?.entryDate],
          entryTitle: [this.entryValues()?.entryTitle],
          entryContent: [this.entryValues()?.entryContent],
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
      return;
    }

    let formData = new FormData();
    formData.append('entryDate', this.form.value.entryDate);
    formData.append('entryTitle', this.form.value.entryTitle);
    formData.append('entryContent', this.form.value.entryContent);
    formData.append('attachmentEntry', this.selectedFile);

    let x = formData.get('entryContent');
    console.log(x);

    this.formSubmitted = false;
    this.closeEntry();
  }

  isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control?.invalid && (control.touched || this.formSubmitted);
  }

  onFileSelect(event: any) {
    this.selectedFile = event.files; // stored in browser memory
  }

  private summonPaper() {
    this.paperState.set(this.access() === 'new' ? 'flying' : 'zoomin');

    // show paper lines and content
    setTimeout(
      () => {
        this.isExpanded.set(true);
        // this.ref.detectChanges();
      },
      this.access() !== 'new' ? 100 : 500,
    );
  }

  showAttachment() {
    this.isAttachmentOpen.update((value) => !value);
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

  closeEntry() {
    this.reset();
  }

  private reset() {
    this.isExpanded.set(false);
    this.isAttachmentOpen.set(false);
    this.paperState.set('hidden');
    this.appService.setIsEntryOpen(false);
  }
}
