import { CommonModule, formatDate } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { GeneralAppService } from 'app/services/general-app.service';
import { ApiClientService } from 'app/services/api-client.service';
import {
  DecryptedDocument,
  DeleteObject,
  EntryAccess,
  EntryParentComponentInput,
  EntryValuesDefault,
  SubmitAction,
} from 'app/models/entry.models';
import { EntryHeaderComponent } from './entry-header/entry-header.component';
import { EntryService } from 'app/services/entry.service';
import { EntryContentComponent } from './entry-content/entry-content.component';
import { EntryFooterComponent } from './entry-footer/entry-footer.component';
import { EncryptionService } from 'app/services/encryption.service';
import { AttachmentService } from 'app/services/attachment.service';
import { DialogModule } from 'primeng/dialog';
import { InfoComponent } from '../info/info.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-entry',
  imports: [
    CommonModule,
    EntryHeaderComponent,
    EntryContentComponent,
    EntryFooterComponent,
    DialogModule,
    InfoComponent,
  ],
  templateUrl: './entry.component.html',
  styleUrl: './entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class EntryComponent implements OnInit, OnDestroy {
  private generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);
  private encryptionService = inject(EncryptionService);
  private attachmentService = inject(AttachmentService);
  private entryService = inject(EntryService);
  private router = inject(Router);

  document = input.required<DecryptedDocument | null>();
  customDate = input<Date | null>(null);
  parentComponent = input.required<EntryParentComponentInput>();
  access = input.required<EntryAccess>();
  contentValues = computed<EntryValuesDefault>(() => {
    return {
      date:
        this.access() === 'new'
          ? (this.customDate() ?? new Date())
          : (this.document()?.date ?? new Date()),
      title: this.document()?.title ?? '',
      content: this.document()?.content ?? '',
      mood: this.document()?.mood ?? 0,
    };
  });

  mood = signal<number>(0);
  form = signal<FormGroup>(new FormGroup({}));
  formValue = signal<any>({});
  isFormSubmitted = signal(false);

  idType = computed(() => this.entryService.getIdType(this.document()?.id ?? ''));
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

  isInfoVisible = model<boolean>(false);

  canSubmitAndPublish = computed(() => {
    if (!this.formValue()?.date) return false;
    const selectedDate = new Date(this.formValue().date);
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() <= today.getTime();
  });

  constructor() {
    effect(() => {
      if (this.generalAppService.isEntryOpen()) this.summonPaper();
    });
  }

  ngOnInit() {
    this.isFormSubmitted.set(false);
  }

  ngOnDestroy() {
    this.closeEntry();
    this.generalAppService.setIsEntryOpen(false);
  }

  hasUnsavedChanges() {
    return this.form().dirty;
  }

  isSubmitting() {
    return this.isFormSubmitted();
  }

  onFormValuesChange(receivedForm: FormGroup) {
    this.form.set(receivedForm);
    this.formValue.set({ ...receivedForm.value });
  }

  onMoodChange(mood: number) {
    this.mood.set(mood);
  }

  async onSubmit(action: SubmitAction) {
    this.isFormSubmitted.set(true);
    const entryFormData = await this.appendFormData();

    if (this.form().invalid && action !== 'update-draft') {
      this.generalAppService.setErrorToast(
        'Form is not completely filled. Please review and try again.',
      );
      this.isFormSubmitted.set(false);
      return;
    }

    if (!this.canSubmitAndPublish() && action !== 'update-draft') {
      this.generalAppService.setWarningToast(
        'You cannot submit or update entries of future dates.',
      );
      return;
    }

    try {
      switch (action) {
        case 'create':
          await this.onCreateEntry(entryFormData);
          break;
        case 'update-entry':
          await this.onUpdateEntry(entryFormData);
          break;
        case 'update-draft':
          await this.onUpdateDraft(entryFormData);
          break;
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.isFormSubmitted.set(false);
    }
  }

  private async onCreateEntry(entryFormData: FormData) {
    try {
      const response = await firstValueFrom(this.apiClientService.createEntry(entryFormData));
      this.generalAppService.setSuccessToast('Entry created successfully.');
      this.generalAppService.triggerRefreshCalendarEvents();

      const location = response.headers.get('Location');
      const entryId = location?.split('/').pop();

      if (this.isParentFullEntryPage()) {
        await this.router.navigate([`entry/view/${entryId}`], { replaceUrl: true });
      } else {
        await this.router.navigate([`entry/view/${entryId}`]);
      }
    } catch (error) {
      console.error(error);
      this.generalAppService.setErrorToast('Failed to create entry.');
      throw error;
    }
  }

  private async onUpdateEntry(entryFormData: FormData) {
    entryFormData.append('id', this.document()!.id);
    try {
      const response = await firstValueFrom(
        this.apiClientService.updateEntry(this.document()!.id, entryFormData),
      );
      this.generalAppService.setSuccessToast('Entry updated successfully.');
      this.generalAppService.triggerRefreshCalendarEvents();

      if (this.isParentFullEntryPage()) {
        await this.router.navigate([`entry/view/${response.id}`], { replaceUrl: true });
      } else {
        await this.router.navigate([`entry/view/${response.id}`]);
      }
    } catch (error) {
      console.error(error);
      this.generalAppService.setErrorToast('Failed to update entry.');
      throw error;
    }
  }

  private async onUpdateDraft(entryFormData: FormData) {
    entryFormData.append('id', this.document()!.id);
    try {
      await firstValueFrom(this.apiClientService.updateDraft(this.document()!.id, entryFormData));
      this.generalAppService.setSuccessToast('Draft updated successfully.');

      if (this.isParentFullEntryPage()) {
        await this.router.navigate(['entry/drafts']);
      } else {
        this.closeEntry();
      }
    } catch (error) {
      console.error(error);
      this.generalAppService.setErrorToast('Failed to update draft.');
      throw error;
    }
  }

  async onSaveAsDraft() {
    this.isFormSubmitted.set(true);

    try {
      const response = await firstValueFrom(this.apiClientService.countUserDrafts());
      if (response.count >= 10) {
        this.generalAppService.setErrorToast('You have reached the maximum number of drafts (10).');
        this.isFormSubmitted.set(false);
        return;
      }

      if (this.form().get('date')?.invalid) {
        this.generalAppService.setErrorToast('Please fill out the date.');
        this.isFormSubmitted.set(false);
        return;
      }

      const draftFormData = await this.appendFormData();

      await firstValueFrom(this.apiClientService.createDraft(draftFormData));
      this.generalAppService.setSuccessToast('Draft saved successfully.');

      await this.router.navigate(['entry/drafts'], { replaceUrl: false });
      this.closeEntry();
    } catch (error) {
      console.error(error);
      this.generalAppService.setErrorToast('Failed to save draft.');
    } finally {
      this.isFormSubmitted.set(false);
    }
  }

  async onPublishDraft() {
    this.isFormSubmitted.set(true);

    if (this.form().invalid) {
      this.generalAppService.setErrorToast(
        'Form is not completely filled. Please review and try again.',
      );
      this.isFormSubmitted.set(false);
      return;
    }

    if (!this.canSubmitAndPublish()) {
      this.generalAppService.setWarningToast('You cannot publish drafts of future dates.');
      return;
    }

    try {
      const entryFormData = await this.appendFormData();
      entryFormData.append('id', this.document()!.id);

      const response = await firstValueFrom(
        this.apiClientService.publishDraft(this.document()!.id, entryFormData),
      );
      this.generalAppService.setSuccessToast('Draft published successfully.');
      this.generalAppService.triggerRefreshCalendarEvents();

      await this.router.navigate([`entry/view/${response.id}`], { replaceUrl: true });
      this.closeEntry();
    } catch (error) {
      console.error(error);
      this.generalAppService.setErrorToast('Failed to publish draft.');
    } finally {
      this.isFormSubmitted.set(false);
    }
  }

  async onDelete(deleteObject: DeleteObject) {
    this.isFormSubmitted.set(true);
    const response = await this.entryService.onDelete(deleteObject);
    if (response == true) {
      if (this.idType() === 'entry') {
        if (this.isParentFullEntryPage()) {
          await this.router.navigate(['entry/search']);
        } else {
          this.generalAppService.setIsEntryOpen(false);
        }
      } else if (this.idType() === 'draft') {
        if (this.isParentFullEntryPage()) {
          await this.router.navigate(['entry/drafts']);
        } else {
          this.generalAppService.setIsEntryOpen(false);
        }
      } else {
        this.generalAppService.setErrorToast('Failed to delete entry.');
      }
    }
    this.isFormSubmitted.set(false);
  }

  onAttachmentsChange(files: File[]) {
    this.selectedFiles = files;
  }

  private async appendFormData(): Promise<FormData> {
    const formData = new FormData();
    const formattedDate = formatDate(this.form().value.date, 'yyyy-MM-dd', 'en-US');
    const encryptedPayload = await this.encryptionService.encrypt({
      title: this.form().value.title,
      content: this.form().value.content,
    });

    formData.append('Date', formattedDate);
    formData.append('Mood', this.mood().toString());
    formData.append('EncryptedContent', encryptedPayload.ciphertext);
    formData.append('ContentIv', encryptedPayload.iv);
    formData.append('ContentSalt', encryptedPayload.salt);

    const attachmentData = await this.attachmentService.processOutgoingAttachments(
      this.selectedFiles,
    );

    formData.append('EncryptedAttachments', attachmentData.encryptedAttachmentBlob ?? '');
    formData.append('EncryptedThumbnails', attachmentData.encryptedThumbnailBlob ?? '');
    formData.append(
      'AttachmentHash',
      attachmentData.attachmentHashes.length > 0
        ? JSON.stringify(attachmentData.attachmentHashes)
        : '',
    );

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

  showEntryInfo() {
    this.isInfoVisible.set(true);
  }
}
