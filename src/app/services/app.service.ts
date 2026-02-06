import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppService {
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
}
