import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
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
})
export class EntryComponent implements OnInit, OnDestroy {
  // inject dependencies
  private ref = inject(ChangeDetectorRef);
  private formBuilder = inject(FormBuilder);
  private appService = inject(AppService);

  // inputs
  parentComponent = input.required<EntryComponentInput>();
  defaultDate = input<Date>(new Date());

  // variables
  @ViewChild('textareaRef') textarea!: ElementRef<HTMLTextAreaElement>;
  form!: FormGroup;
  formSubmitted = false;
  selectedFile: any;

  // paper state
  paperState: 'hidden' | 'flying' = 'hidden';
  isExpanded = false;
  isAttachmentOpen = false;

  constructor() {
    this.form = this.formBuilder.group({
      entryDate: [new Date(), Validators.required],
      entryTitle: ['', Validators.required],
      entryContent: ['', Validators.required],
    });

    // console.log('constructor', this.defaultDate());
  }

  ngOnInit(): void {
    if (this.appService.isEntryOpen()) {
      this.summonPaper();
    }

    this.form.setValue({
      entryDate: this.defaultDate(),
      entryTitle: '',
      entryContent: '',
    });
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
    this.paperState = 'flying';

    // show paper lines and content
    setTimeout(() => {
      this.isExpanded = true;
      this.ref.detectChanges();
    }, 500);
  }

  showAttachment() {
    this.isAttachmentOpen = !this.isAttachmentOpen;
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
    this.isExpanded = false;
    this.isAttachmentOpen = false;
    this.paperState = 'hidden';
    this.appService.setIsEntryOpen(false);
  }
}
