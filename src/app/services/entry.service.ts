import { formatDate } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EntryAccess } from 'app/models/entry.models';
import { Subject } from 'rxjs';
import { HashService } from './hash.service';

@Injectable({
  providedIn: 'root',
})
export class EntryService {
  private readonly _formSubmitted = signal(false);
  readonly formSubmitted = this._formSubmitted.asReadonly();
  setFormSubmitted(value: boolean) {
    this._formSubmitted.set(value);
  }
}
