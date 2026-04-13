import { inject, Injectable, signal } from '@angular/core';
import { DeleteObject } from 'app/models/entry.models';
import { ConfirmationService } from 'primeng/api';
import { GeneralAppService } from './general-app.service';
import { ApiClientService } from './api-client.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EntryService {
  private confirmationService = inject(ConfirmationService);
  private apiClientService = inject(ApiClientService);
  private generalAppService = inject(GeneralAppService);

  readonly starClickTrigger = signal(0);
  triggerStarClick() {
    this.starClickTrigger.set(this.starClickTrigger() + 1);
  }
  resetStarClickTrigger() {
    this.starClickTrigger.set(0);
  }

  readonly homeAccessTrigger = signal(0);
  triggerHomeAccess() {
    this.homeAccessTrigger.set(this.homeAccessTrigger() + 1);
  }
  resetHomeAccessTrigger() {
    this.homeAccessTrigger.set(0);
  }

  getIdType(id: string): 'entry' | 'draft' | null {
    const [type] = id.split('-');
    return type === 'entry' || type === 'draft' ? type : null;
  }

  async onDelete(deleteObject: DeleteObject): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmationService.confirm({
        message:
          '<span class="fw-semibold">Do you want to delete this entry?</span> <br /><br />' +
          (deleteObject.title ? deleteObject.title : '<i>Untitled</i>'),
        header: 'Confirm Delete',
        icon: 'fa-solid fa-circle-exclamation',
        dismissableMask: true,
        rejectLabel: 'Cancel',
        rejectButtonProps: {
          label: 'Cancel',
          severity: 'secondary',
          outlined: true,
        },
        acceptButtonProps: {
          label: 'Delete',
          severity: 'danger',
        },
        accept: async () => {
          try {
            const response = await this.executeDelete(deleteObject.entityId);
            if (response) {
              const type = this.getIdType(deleteObject.entityId);
              if (type === 'entry') {
                this.generalAppService.setSuccessToast('Entry deleted successfully.');
                this.generalAppService.triggerRefreshCalendarEvents();
              } else if (type === 'draft') {
                this.generalAppService.setSuccessToast('Draft deleted successfully.');
              }
            } else {
              this.generalAppService.setErrorToast('Failed to delete record.');
            }
            resolve(response);
          } catch (error) {
            console.error(error);
            this.generalAppService.setErrorToast('Failed to delete record.');
            resolve(false);
          }
        },
        reject: () => {
          resolve(false);
        },
      });
    });
  }

  private async executeDelete(entityId: string): Promise<boolean> {
    if (!entityId) {
      this.generalAppService.setErrorToast('No entry ID found.');
      return false;
    }

    const type = this.getIdType(entityId);
    try {
      if (type === 'entry') {
        await firstValueFrom(this.apiClientService.deleteEntry(entityId));
        return true;
      }

      if (type === 'draft') {
        await firstValueFrom(this.apiClientService.deleteDraft(entityId));
        return true;
      }
    } catch (error) {
      console.error(error);
      return false;
    }

    return false;
  }
}
