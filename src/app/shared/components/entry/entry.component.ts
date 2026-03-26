import { CommonModule, formatDate } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import { HashService } from 'app/services/hash.service';
import {
  AttachmentObjResponse,
  EntryAccess,
  EntryParentComponentInput,
  EntryValues,
  SubmitAction,
} from 'app/models/entry.models';
import { EntryHeaderComponent } from './entry-header/entry-header.component';
import { EntryService } from 'app/services/entry.service';
import { EntryContentComponent } from './entry-content/entry-content.component';
import { EntryFooterComponent } from './entry-footer/entry-footer.component';

@Component({
  selector: 'app-entry',
  imports: [CommonModule, EntryHeaderComponent, EntryContentComponent, EntryFooterComponent],
  templateUrl: './entry.component.html',
  styleUrl: './entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryComponent implements OnInit, OnDestroy {
  // inject dependencies
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);
  entryService = inject(EntryService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // inputs
  sourceId = input.required<string | null>();
  parentComponent = input.required<EntryParentComponentInput>();
  access = input.required<EntryAccess>();
  values = input.required<EntryValues>();
  attachments = input<AttachmentObjResponse[]>([]);

  form = signal<FormGroup>(new FormGroup({}));
  mood = signal<number | null>(null);

  isParentFullEntryPage = computed(
    () =>
      this.parentComponent() === 'add-entry' ||
      this.parentComponent() === 'edit-entry' ||
      this.parentComponent() === 'view-entry',
  );

  selectedFiles: File[] = [];

  // paper state
  paperTransitionState = signal<'hidden' | 'flying' | 'zoomin'>('hidden');
  isEntryPaperExpanded = signal(false);

  constructor() {
    effect(() => {
      if (this.generalAppService.isEntryOpen()) this.summonPaper();
    });
  }

  ngOnInit(): void {
    this.entryService.setFormSubmitted(false);
  }

  ngOnDestroy(): void {
    this.closeEntry();
    this.generalAppService.setIsEntryOpen(false);
  }

  onFormValuesChange(form: FormGroup) {
    this.form.set(form);
  }

  onMoodChange(mood: number | null) {
    this.mood.set(mood);
  }

  async onSubmit(action: SubmitAction) {
    this.entryService.setFormSubmitted(true);
    const entryFormData = await this.appendFormData();

    if (this.form().invalid) {
      this.generalAppService.setErrorToast(
        'There are errors in the form. Please review and try again.',
      );
      return;
    }

    switch (action) {
      case 'create':
        this.onCreateEntry(entryFormData);
        break;
      case 'update-entry':
        this.onUpdateEntry(entryFormData);
        break;
      case 'update-draft':
        this.onUpdateDraft(entryFormData);
        break;
    }

    this.entryService.setFormSubmitted(false);
  }

  private onCreateEntry(entryFormData: FormData) {
    this.apiClientService
      .createEntry(entryFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generalAppService.setSuccessToast('Entry created successfully.');
          this.generalAppService.triggerRefreshCalendarEvents();

          const location = response.headers.get('Location');
          const entryId = location?.split('/').pop();

          if (this.isParentFullEntryPage()) {
            this.router.navigate([`entry/view/${entryId}`], { replaceUrl: true });
          } else {
            this.router.navigate([`entry/view/${entryId}`]);
          }
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to create entry.');
        },
      });
  }

  private onUpdateEntry(entryFormData: FormData) {
    entryFormData.append('id', this.sourceId()!);
    this.apiClientService
      .updateEntry(this.sourceId()!, entryFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generalAppService.setSuccessToast('Entry updated successfully.');
          this.generalAppService.triggerRefreshCalendarEvents();

          if (this.isParentFullEntryPage()) {
            this.router.navigate([`entry/view/${response.id}`], { replaceUrl: true });
          } else {
            this.router.navigate([`entry/view/${response.id}`]);
          }
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to update entry.');
        },
      });
  }

  private onUpdateDraft(entryFormData: FormData) {
    entryFormData.append('id', this.sourceId()!);
    this.apiClientService
      .updateDraft(this.sourceId()!, entryFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.generalAppService.setSuccessToast('Draft updated successfully.');

          if (this.isParentFullEntryPage()) {
            this.router.navigate(['entry/drafts']);
          } else {
            this.generalAppService.setIsEntryOpen(false);
          }
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to update draft.');
        },
      });
  }

  async onSaveAsDraft() {
    this.entryService.setFormSubmitted(true);

    this.apiClientService
      .countUserDrafts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.count >= 10) {
            this.generalAppService.setErrorToast(
              'You have reached the maximum number of drafts (10).',
            );
            return;
          }
        },
        error: (error) => {
          console.log(error);
        },
      });

    if (this.form().get('date')?.invalid) {
      this.generalAppService.setErrorToast('Please fill out the date.');
      return;
    }

    const draftFormData = await this.appendFormData();

    this.apiClientService
      .createDraft(draftFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.generalAppService.setSuccessToast('Draft saved successfully.');

          this.router.navigate(['entry/drafts'], { replaceUrl: true });
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to create draft.');
        },
      });

    this.entryService.setFormSubmitted(false);
    this.closeEntry();
  }

  async onPublishDraft() {
    this.entryService.setFormSubmitted(true);

    if (this.form().invalid) {
      this.generalAppService.setErrorToast(
        'There are errors in the form. Please review and try again.',
      );
      return;
    }

    const entryFormData = await this.appendFormData();
    entryFormData.append('id', this.sourceId()!);

    this.apiClientService
      .publishDraft(this.sourceId()!, entryFormData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generalAppService.setSuccessToast('Draft published successfully.');
          this.generalAppService.triggerRefreshCalendarEvents();

          this.router.navigate([`entry/view/${response.id}`], { replaceUrl: true });
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to create entry.');
        },
      });
  }

  onDelete(type: 'entry' | 'draft') {
    const entityId = this.sourceId();
    if (!entityId) {
      this.generalAppService.setErrorToast('No entry ID found.');
      return;
    }

    switch (type) {
      case 'entry':
        this.deleteEntry(entityId);
        break;
      case 'draft':
        this.deleteDraft(entityId);
        break;
    }
  }

  private deleteEntry(entityId: string) {
    this.apiClientService
      .deleteEntry(entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.generalAppService.setSuccessToast('Entry deleted successfully.');

          this.generalAppService.triggerRefreshCalendarEvents();

          if (this.isParentFullEntryPage()) {
            this.router.navigate(['entry/search']);
          } else {
            this.generalAppService.setIsEntryOpen(false);
          }
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to delete entry.');
        },
      });
  }

  private deleteDraft(entityId: string) {
    this.apiClientService
      .deleteDraft(entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.generalAppService.setSuccessToast('Draft deleted successfully.');

          if (this.isParentFullEntryPage()) {
            this.router.navigate(['entry/drafts']);
          } else {
            this.generalAppService.setIsEntryOpen(false);
          }
        },
        error: (error) => {
          console.log(error);
          this.generalAppService.setErrorToast('Failed to delete draft.');
        },
      });
  }

  onAttachmentsChange(files: File[]) {
    this.selectedFiles = files;
  }

  private async appendFormData(): Promise<FormData> {
    const formData = new FormData();
    const formattedDate = formatDate(this.form().value.date, 'yyyy-MM-dd', 'en-US');
    formData.append('Date', formattedDate);
    formData.append('Title', this.form().value.title);
    formData.append('Content', this.form().value.content);
    formData.append('Mood', this.mood()?.toString() || '0');
    this.selectedFiles.forEach((file) => {
      formData.append('Attachments', file);
    });

    return formData;
  }

  private summonPaper() {
    if (this.isParentFullEntryPage()) {
      this.isEntryPaperExpanded.set(true);
      return;
    }

    this.paperTransitionState.set(this.access() === 'new' ? 'flying' : 'zoomin');

    setTimeout(
      () => {
        this.isEntryPaperExpanded.set(true);
      },
      this.access() !== 'new' ? 100 : 500,
    );
  }

  backgroundClick() {
    switch (this.parentComponent()) {
      case 'home':
      case 'calendar':
        this.closeEntry();
        break;
      default:
        break;
    }
  }

  closeEntry() {
    this.paperTransitionState.set('hidden');

    if (!this.isParentFullEntryPage()) {
      this.isEntryPaperExpanded.set(false);
      this.generalAppService.setIsEntryOpen(false);
    }
  }
}
