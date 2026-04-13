import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import {
  EntryAccess,
  EntryParentComponentInput,
  EntryValuesDefault,
} from 'app/models/entry.models';
import { ErrorInputComponent } from '../../error-input/error-input.component';
import { InputTextModule } from 'primeng/inputtext';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';
import { MoodRatingComponent } from '../../mood-rating/mood-rating.component';
import { EntryService } from 'app/services/entry.service';

@Component({
  selector: 'app-entry-content',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    InputTextModule,
    ErrorInputComponent,
    MoodRatingComponent,
  ],
  templateUrl: './entry-content.component.html',
  styleUrl: './entry-content.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryContentComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private entryService = inject(EntryService);

  sourceId = input.required<string | null>();
  access = input.required<EntryAccess>();
  values = input.required<EntryValuesDefault>();
  isParentFullEntryPage = input.required<boolean>();
  paperTransitionState = input.required<'hidden' | 'flying' | 'zoomin'>();
  isEntryPaperExpanded = input.required<boolean>();
  isFormSubmitted = input.required<boolean>();

  formValuesChange = output<FormGroup>();
  moodChange = output<number>();
  closeEntry = output<void>();

  form!: FormGroup;

  idType = computed(() => this.entryService.getIdType(this.sourceId() ?? ''));
  placeholder = computed(() =>
    this.access() === 'new' ? 'Start writing your thoughts here...' : '',
  );

  titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleRef');
  measuringSpan = viewChild.required<ElementRef<HTMLSpanElement>>('measuringSpan');
  paperInnerRef = viewChild.required<ElementRef<HTMLDivElement>>('paperInnerRef');
  contentRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('contentRef');

  ngOnInit() {
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
        break;
      case 'edit-entry':
      case 'edit-draft':
        this.form = this.formBuilder.group({
          date: [this.values().date, Validators.required],
          title: [this.values().title, [Validators.required, Validators.maxLength(100)]],
          content: [this.values().content, [Validators.required, Validators.maxLength(5000)]],
        });
        break;
      default:
        break;
    }

    if (this.access() !== 'view') {
      this.formValuesChange.emit(this.form);
      this.form.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(300))
        .subscribe(() => {
          this.formValuesChange.emit(this.form);
        });
    }
  }

  ngAfterViewInit() {
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

  onMoodChange(mood: number) {
    this.moodChange.emit(mood);
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

  isInvalid(form: FormGroup, controlName: string) {
    const control = form.get(controlName);
    return control?.invalid && (control.touched || this.isFormSubmitted());
  }

  onCloseEntry() {
    this.closeEntry.emit();
  }
}
