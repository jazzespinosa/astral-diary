import { effect, inject, Injectable, signal } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private messageService = inject(MessageService);

  constructor() {
    effect(() => {
      this.messageService.add(this.toastMessage());
    });
  }

  private readonly _isBackgroundMilkyWay = signal(false);
  readonly isBackgroundMilkyWay = this._isBackgroundMilkyWay.asReadonly();
  setIsBackgroundMilkyWay(value: boolean) {
    this._isBackgroundMilkyWay.set(value);
  }

  private readonly _isEntryOpen = signal(false);
  readonly isEntryOpen = this._isEntryOpen.asReadonly();
  setIsEntryOpen(value: boolean) {
    this._isEntryOpen.set(value);
  }

  private readonly _isMobileView = signal(false);
  readonly isMobileView = this._isMobileView.asReadonly();
  setIsMobileView(value: boolean) {
    this._isMobileView.set(value);
  }

  private readonly _activeLink = signal('');
  readonly activeLink = this._activeLink.asReadonly();
  setActiveLink(value: string) {
    this._activeLink.set(value);
  }

  private readonly _toastMessage = signal<ToastMessageOptions>({});
  readonly toastMessage = this._toastMessage.asReadonly();
  setToastMessage(value: ToastMessageOptions) {
    this._toastMessage.set(value);
  }
}
